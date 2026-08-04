// routes/arc.js
//
// Drop-in replacement / reference for your existing ARC endpoints.
// Wire this router where your current /v1/arc/* routes live, or copy
// the relevant pieces into your existing handlers.
//
// Assumes: an Express app, a Supabase client instance, and existing
// API-key auth middleware that sets req.clientId (adjust name to match yours).

const express = require('express');
const { idempotencyMiddleware } = require('../lib/idempotency');
const { createAuditLogger, hashPayload } = require('../lib/auditLog');

function buildArcRouter(supabase) {
  const router = express.Router();
  const auditLog = createAuditLogger(supabase);

  // --- POST /v1/arc/send ---
  router.post(
    '/send',
    idempotencyMiddleware(supabase, 'arc.send'),
    async (req, res) => {
      const { senderCasp, receiverCasp, payload } = req.body;

      if (!senderCasp || !receiverCasp || !payload) {
        const body = { error: 'invalid_request', message: 'senderCasp, receiverCasp, and payload are required.' };
        await res.recordIdempotentFailure?.();
        return res.status(400).json(body);
      }

      try {
        // 1. Create the transmission record first, so we have an ID to log against
        // even if the actual send to the receiver fails.
        const { data: transmission, error: createErr } = await supabase
          .from('arc_transmissions')
          .insert({
            sender_casp: senderCasp,
            receiver_casp: receiverCasp,
            current_status: 'pending',
            payload_hash: hashPayload(payload)
          })
          .select()
          .single();

        if (createErr) throw createErr;

        await auditLog.logEvent({
          transmissionId: transmission.id,
          eventType: 'send_initiated',
          senderCasp,
          receiverCasp,
          payload,
          status: 'pending',
          idempotencyKey: req.idempotencyKey
        });

        // 2. Attempt actual delivery to the receiving CASP.
        // Replace this block with your real transmission logic.
        const deliveryResult = await attemptDelivery(receiverCasp, payload);

        if (deliveryResult.success) {
          await auditLog.upsertTransmissionStatus(transmission.id, { current_status: 'delivered' });
          await auditLog.logEvent({
            transmissionId: transmission.id,
            eventType: 'send_delivered',
            senderCasp,
            receiverCasp,
            payload,
            status: 'delivered',
            idempotencyKey: req.idempotencyKey
          });

          const responseBody = { transmissionId: transmission.id, status: 'delivered' };
          await res.recordIdempotentResponse(200, responseBody);
          return res.status(200).json(responseBody);
        } else {
          await auditLog.upsertTransmissionStatus(transmission.id, {
            current_status: 'failed',
            last_error: deliveryResult.reason,
            attempt_count: 1
          });
          await auditLog.logEvent({
            transmissionId: transmission.id,
            eventType: 'send_failed',
            senderCasp,
            receiverCasp,
            payload,
            status: 'failed',
            errorReason: deliveryResult.reason,
            idempotencyKey: req.idempotencyKey
          });

          const responseBody = { transmissionId: transmission.id, status: 'failed', reason: deliveryResult.reason };
          // A failed delivery is still a "completed" request from the API's
          // perspective — the client retrying with the SAME idempotency key
          // should get this same failed result back, not a fresh attempt.
          // If you want failed sends to be retryable under the same key,
          // record 'failed' instead of calling recordIdempotentResponse here —
          // see the note in lib/idempotency.js.
          await res.recordIdempotentResponse(502, responseBody);
          return res.status(502).json(responseBody);
        }
      } catch (err) {
        await res.recordIdempotentFailure?.();
        console.error('[arc.send] unexpected error', err);
        return res.status(500).json({ error: 'internal_error', message: 'Failed to process transmission.' });
      }
    }
  );

  // --- POST /v1/arc/receive ---
  router.post(
    '/receive',
    idempotencyMiddleware(supabase, 'arc.receive'),
    async (req, res) => {
      const { senderCasp, receiverCasp, payload } = req.body;

      if (!senderCasp || !receiverCasp || !payload) {
        const body = { error: 'invalid_request', message: 'senderCasp, receiverCasp, and payload are required.' };
        await res.recordIdempotentFailure?.();
        return res.status(400).json(body);
      }

      try {
        const accepted = await validateIncomingPayload(payload);

        const { data: transmission, error: createErr } = await supabase
          .from('arc_transmissions')
          .insert({
            sender_casp: senderCasp,
            receiver_casp: receiverCasp,
            current_status: accepted ? 'delivered' : 'rejected',
            payload_hash: hashPayload(payload)
          })
          .select()
          .single();

        if (createErr) throw createErr;

        await auditLog.logEvent({
          transmissionId: transmission.id,
          eventType: accepted ? 'receive_accepted' : 'receive_rejected',
          senderCasp,
          receiverCasp,
          payload,
          status: accepted ? 'delivered' : 'rejected',
          errorReason: accepted ? null : 'payload_validation_failed',
          idempotencyKey: req.idempotencyKey
        });

        const statusCode = accepted ? 200 : 422;
        const responseBody = { transmissionId: transmission.id, status: accepted ? 'accepted' : 'rejected' };
        await res.recordIdempotentResponse(statusCode, responseBody);
        return res.status(statusCode).json(responseBody);
      } catch (err) {
        await res.recordIdempotentFailure?.();
        console.error('[arc.receive] unexpected error', err);
        return res.status(500).json({ error: 'internal_error', message: 'Failed to process incoming transmission.' });
      }
    }
  );

  // --- GET /v1/arc/status/:id ---
  // Returns enough for a compliance dashboard to answer "what happened,
  // and why" without digging through raw logs.
  router.get('/status/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const { data: transmission, error } = await supabase
        .from('arc_transmissions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!transmission) {
        return res.status(404).json({ error: 'not_found', message: 'No transmission found with that ID.' });
      }

      const history = await auditLog.getHistory(id);

      await auditLog.logEvent({
        transmissionId: id,
        eventType: 'status_check',
        status: transmission.current_status
      });

      return res.status(200).json({
        transmissionId: transmission.id,
        senderCasp: transmission.sender_casp,
        receiverCasp: transmission.receiver_casp,
        status: transmission.current_status,
        attemptCount: transmission.attempt_count,
        lastError: transmission.last_error,
        createdAt: transmission.created_at,
        updatedAt: transmission.updated_at,
        // Full event history — useful for a compliance officer who needs
        // to show exactly what happened and when, not just the current state.
        history: history.map(h => ({
          eventType: h.event_type,
          status: h.status,
          errorReason: h.error_reason,
          timestamp: h.created_at
        }))
      });
    } catch (err) {
      console.error('[arc.status] unexpected error', err);
      return res.status(500).json({ error: 'internal_error', message: 'Failed to fetch transmission status.' });
    }
  });

  return router;
}

// --- Placeholder functions — replace with your real implementations ---

async function attemptDelivery(receiverCasp, payload) {
  // TODO: replace with your actual CASP-to-CASP delivery logic
  // (e.g. looking up the receiver's endpoint via the CASP registry and POSTing).
  return { success: true };
}

async function validateIncomingPayload(payload) {
  // TODO: replace with your actual Travel Rule payload validation
  // (required fields present, signatures valid, sender CASP is registered, etc.)
  return true;
}

module.exports = { buildArcRouter };
