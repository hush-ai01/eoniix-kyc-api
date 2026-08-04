import express from 'express';
import crypto from 'crypto';
import { idempotencyMiddleware } from './idempotency.js';
import { createAuditLogger, hashPayload } from './auditLog.js';

export function buildArcRouter(supabase) {
  const router = express.Router();
  const auditLog = createAuditLogger(supabase);

  router.post('/send', idempotencyMiddleware(supabase, 'arc.send'), async (req, res) => {
    const { receiverCasp, payload } = req.body;
    if (!req.caspId) {
      return res.status(403).json({ error: 'forbidden', message: 'API key is not bound to a CASP.' });
    }
    if (req.body.senderCasp && req.body.senderCasp !== req.caspId) {
      return res.status(403).json({ error: 'forbidden', message: 'senderCasp does not match authenticated CASP.' });
    }
    const senderCasp = req.caspId;
    if (!senderCasp || !receiverCasp || !payload) {
      const body = { error: 'invalid_request', message: 'senderCasp, receiverCasp, and payload are required.' };
      await res.recordIdempotentFailure?.();
      return res.status(400).json(body);
    }
    try {
      const { data: transmission, error: createErr } = await supabase
        .from('arc_transmissions')
        .insert({ sender_casp: senderCasp, receiver_casp: receiverCasp, current_status: 'pending', payload_hash: hashPayload(payload) })
        .select().single();
      if (createErr) throw createErr;

      await auditLog.logEvent({ transmissionId: transmission.id, eventType: 'send_initiated', senderCasp, receiverCasp, payload, status: 'pending', idempotencyKey: req.idempotencyKey });

      const deliveryResult = await attemptDelivery(receiverCasp, payload, supabase);

      if (deliveryResult.success) {
        await auditLog.upsertTransmissionStatus(transmission.id, { current_status: 'delivered' });
        await auditLog.logEvent({ transmissionId: transmission.id, eventType: 'send_delivered', senderCasp, receiverCasp, payload, status: 'delivered', idempotencyKey: req.idempotencyKey });
        const responseBody = { transmissionId: transmission.id, status: 'delivered' };
        await res.recordIdempotentResponse(200, responseBody);
        return res.status(200).json(responseBody);
      } else {
        await auditLog.upsertTransmissionStatus(transmission.id, { current_status: 'failed', last_error: deliveryResult.reason, attempt_count: 1 });
        await auditLog.logEvent({ transmissionId: transmission.id, eventType: 'send_failed', senderCasp, receiverCasp, payload, status: 'failed', errorReason: deliveryResult.reason, idempotencyKey: req.idempotencyKey });
        const responseBody = { transmissionId: transmission.id, status: 'failed', reason: deliveryResult.reason };
        await res.recordIdempotentResponse(502, responseBody);
        return res.status(502).json(responseBody);
      }
    } catch (err) {
      await res.recordIdempotentFailure?.();
      return res.status(500).json({ error: 'internal_error', message: 'Failed to process transmission.' });
    }
  });

  router.post('/receive', idempotencyMiddleware(supabase, 'arc.receive'), async (req, res) => {
    const { receiverCasp, payload } = req.body;
    if (!req.caspId) {
      return res.status(403).json({ error: 'forbidden', message: 'API key is not bound to a CASP.' });
    }
    if (req.body.senderCasp && req.body.senderCasp !== req.caspId) {
      return res.status(403).json({ error: 'forbidden', message: 'senderCasp does not match authenticated CASP.' });
    }
    const senderCasp = req.caspId;
    if (!senderCasp || !receiverCasp || !payload) {
      await res.recordIdempotentFailure?.();
      return res.status(400).json({ error: 'invalid_request', message: 'senderCasp, receiverCasp, and payload are required.' });
    }
    try {
      const accepted = await validateIncomingPayload(payload);
      const { data: transmission, error: createErr } = await supabase
        .from('arc_transmissions')
        .insert({ sender_casp: senderCasp, receiver_casp: receiverCasp, current_status: accepted ? 'delivered' : 'rejected', payload_hash: hashPayload(payload) })
        .select().single();
      if (createErr) throw createErr;

      await auditLog.logEvent({ transmissionId: transmission.id, eventType: accepted ? 'receive_accepted' : 'receive_rejected', senderCasp, receiverCasp, payload, status: accepted ? 'delivered' : 'rejected', errorReason: accepted ? null : 'payload_validation_failed', idempotencyKey: req.idempotencyKey });

      const statusCode = accepted ? 200 : 422;
      const responseBody = { transmissionId: transmission.id, status: accepted ? 'accepted' : 'rejected' };
      await res.recordIdempotentResponse(statusCode, responseBody);
      return res.status(statusCode).json(responseBody);
    } catch (err) {
      await res.recordIdempotentFailure?.();
      return res.status(500).json({ error: 'internal_error', message: 'Failed to process incoming transmission.' });
    }
  });

  router.get('/status/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const { data: transmission, error } = await supabase
        .from('arc_transmissions').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!transmission) return res.status(404).json({ error: 'not_found', message: 'No transmission found with that ID.' });

      const history = await auditLog.getHistory(id);
      await auditLog.logEvent({ transmissionId: id, eventType: 'status_check', status: transmission.current_status });

      return res.status(200).json({
        transmissionId: transmission.id,
        senderCasp: transmission.sender_casp,
        receiverCasp: transmission.receiver_casp,
        status: transmission.current_status,
        attemptCount: transmission.attempt_count,
        lastError: transmission.last_error,
        createdAt: transmission.created_at,
        updatedAt: transmission.updated_at,
        history: history.map(h => ({ eventType: h.event_type, status: h.status, errorReason: h.error_reason, timestamp: h.created_at }))
      });
    } catch (err) {
      return res.status(500).json({ error: 'internal_error', message: 'Failed to fetch transmission status.' });
    }
  });

  return router;
}

async function attemptDelivery(receiverCasp, payload, supabase) {
  try {
    const { data: casp, error } = await supabase
      .from('casp_registry')
      .select('endpoint_url')
      .eq('casp_id', receiverCasp)
      .eq('active', true)
      .single();

    if (error || !casp || !casp.endpoint_url) {
      return { success: false, reason: 'Receiver CASP not found or not active.' };
    }

    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', process.env.API_KEY_SECRET)
      .update(body)
      .digest('hex');

    const res = await fetch(casp.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sove-Signature': `sha256=${signature}`
      },
      body,
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      return { success: false, reason: `Receiver responded with status ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

async function validateIncomingPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;

  const requiredBase = ['originatorFullName', 'originatorWallet', 'beneficiaryWallet', 'amountZar', 'threshold'];
  for (const field of requiredBase) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      return false;
    }
  }

  if (typeof payload.originatorFullName !== 'string' || payload.originatorFullName.trim().length < 2) return false;
  if (typeof payload.originatorWallet !== 'string' || payload.originatorWallet.length < 10) return false;
  if (typeof payload.beneficiaryWallet !== 'string' || payload.beneficiaryWallet.length < 10) return false;
  if (typeof payload.amountZar !== 'number' || payload.amountZar <= 0) return false;
  if (!['full', 'reduced'].includes(payload.threshold)) return false;

  if (payload.threshold === 'full' && (!payload.soveVerificationId || typeof payload.soveVerificationId !== 'string')) {
    return false;
  }

  return true;
}
