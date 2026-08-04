// lib/idempotency.js
//
// Express middleware that makes an endpoint safe to retry.
// Client sends an `Idempotency-Key` header (a UUID they generate once per
// logical request). If the same key comes in again — because their request
// timed out and they retried, or a network blip caused a double-send —
// we return the original response instead of re-processing.
//
// Requires: Supabase client, and the arc_idempotency_keys table
// from sql/001_arc_hardening.sql

const crypto = require('crypto');

function hashBody(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} endpointName - e.g. 'arc.send', 'arc.receive'
 */
function idempotencyMiddleware(supabase, endpointName) {
  return async function (req, res, next) {
    const idempotencyKey = req.header('Idempotency-Key');

    // Idempotency-Key is required for ARC send/receive — this is a
    // financial transmission endpoint, we don't want it optional.
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'missing_idempotency_key',
        message: 'An Idempotency-Key header is required for this endpoint.'
      });
    }

    // client_id should already be set by your API key auth middleware
    // (req.clientId or similar) — adjust this line to match your auth layer.
    const clientId = req.clientId || req.apiKeyId;
    if (!clientId) {
      return res.status(500).json({ error: 'missing_client_context' });
    }

    const requestHash = hashBody(req.body);

    // Check for an existing record with this key
    const { data: existing, error: fetchErr } = await supabase
      .from('arc_idempotency_keys')
      .select('*')
      .eq('client_id', clientId)
      .eq('idempotency_key', idempotencyKey)
      .eq('endpoint', endpointName)
      .maybeSingle();

    if (fetchErr) {
      return res.status(500).json({ error: 'idempotency_lookup_failed', detail: fetchErr.message });
    }

    if (existing) {
      // Same key, different payload — this is a client bug (key reuse
      // with different data), not a safe retry. Reject it loudly rather
      // than silently processing the wrong payload under an old key.
      if (existing.request_hash !== requestHash) {
        return res.status(422).json({
          error: 'idempotency_key_conflict',
          message: 'This Idempotency-Key was already used with a different request payload.'
        });
      }

      if (existing.status === 'completed') {
        // Return the original response verbatim — the caller sees the
        // same result as if this were the first (and only) attempt.
        return res.status(existing.response_status).json(existing.response_body);
      }

      if (existing.status === 'in_progress') {
        // Original request is still being processed (e.g. a fast retry
        // while the first call hasn't finished). Tell the client to back off
        // rather than letting two copies of the handler run concurrently.
        return res.status(409).json({
          error: 'request_in_progress',
          message: 'A request with this Idempotency-Key is already being processed.'
        });
      }
      // status === 'failed' falls through to reprocessing below —
      // a failed attempt is safe to retry.
    } else {
      // First time we've seen this key — reserve it before doing any work.
      const { error: insertErr } = await supabase
        .from('arc_idempotency_keys')
        .insert({
          client_id: clientId,
          idempotency_key: idempotencyKey,
          endpoint: endpointName,
          request_hash: requestHash,
          status: 'in_progress'
        });

      if (insertErr) {
        // Unique constraint hit = a concurrent request beat us to it.
        return res.status(409).json({
          error: 'request_in_progress',
          message: 'A request with this Idempotency-Key is already being processed.'
        });
      }
    }

    // Give the route handler a way to record the final response
    // against this idempotency key once it's done.
    res.recordIdempotentResponse = async (statusCode, body) => {
      await supabase
        .from('arc_idempotency_keys')
        .update({
          status: 'completed',
          response_status: statusCode,
          response_body: body,
          completed_at: new Date().toISOString()
        })
        .eq('client_id', clientId)
        .eq('idempotency_key', idempotencyKey)
        .eq('endpoint', endpointName);
    };

    res.recordIdempotentFailure = async () => {
      await supabase
        .from('arc_idempotency_keys')
        .update({ status: 'failed' })
        .eq('client_id', clientId)
        .eq('idempotency_key', idempotencyKey)
        .eq('endpoint', endpointName);
    };

    req.idempotencyKey = idempotencyKey;
    next();
  };
}

module.exports = { idempotencyMiddleware, hashBody };
