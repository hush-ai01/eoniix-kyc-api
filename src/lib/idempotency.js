import crypto from 'crypto';

function hashBody(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
}

export function idempotencyMiddleware(supabase, endpointName) {
  return async function (req, res, next) {
    const idempotencyKey = req.header('Idempotency-Key');
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'missing_idempotency_key',
        message: 'An Idempotency-Key header is required for this endpoint.'
      });
    }

    const clientId = req.clientId || req.apiKeyId;
    if (!clientId) {
      return res.status(500).json({ error: 'missing_client_context' });
    }

    const requestHash = hashBody(req.body);

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
      if (existing.request_hash !== requestHash) {
        return res.status(422).json({
          error: 'idempotency_key_conflict',
          message: 'This Idempotency-Key was already used with a different request payload.'
        });
      }
      if (existing.status === 'completed') {
        return res.status(existing.response_status).json(existing.response_body);
      }
      if (existing.status === 'in_progress') {
        return res.status(409).json({
          error: 'request_in_progress',
          message: 'A request with this Idempotency-Key is already being processed.'
        });
      }
    } else {
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
        return res.status(409).json({
          error: 'request_in_progress',
          message: 'A request with this Idempotency-Key is already being processed.'
        });
      }
    }

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

export { hashBody };
