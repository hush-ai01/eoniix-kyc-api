import express from 'express';
import { idempotencyMiddleware } from './idempotency.js';
import { createAuditLogger, hashPayload } from './auditLog.js';

export function buildArcRouter(supabase) {
  const router = express.Router();
  const auditLog = createAuditLogger(supabase);

  router.post('/send', idempotencyMiddleware(supabase, 'arc.send'), async (req, res) => {
    const { senderCasp, receiverCasp, payload } = req.body;
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

      const deliveryResult = await attemptDelivery(receiverCasp, payload);

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
    const { senderCasp, receiverCasp, payload } = req.body;
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

async function attemptDelivery(receiverCasp, payload) {
  return { success: true };
}

async function validateIncomingPayload(payload) {
  return true;
}
