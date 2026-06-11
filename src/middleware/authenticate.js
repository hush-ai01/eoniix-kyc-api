import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashKey(rawKey) {
  return crypto
    .createHmac('sha256', process.env.API_KEY_SECRET)
    .update(rawKey)
    .digest('hex');
}

async function lookupApiKey(rawKey) {
  const prefix = rawKey.slice(0, 8);
  const hash = hashKey(rawKey);

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', prefix)
    .eq('status', 'active')
    .single();

  if (error || !data) return null;

  const storedHash = Buffer.isBuffer(data.key_hash)
    ? data.key_hash.toString('hex')
    : data.key_hash;

  const valid = crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );

  if (!valid) return null;

  return data;
}

export async function authenticate(req, res, next) {
  const rawKey = req.headers['x-api-key'];

  if (!rawKey) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid x-api-key header.' });
  }

  const keyRecord = await lookupApiKey(rawKey);

  if (!keyRecord) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or revoked API key.' });
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Unauthorized. API key has expired.' });
  }

  req.apiKeyId = keyRecord.id;
  req.caspId = keyRecord.casp_id || null;
  req.partnerId = keyRecord.business_name || null;
  req.scopes = keyRecord.scopes || [];

  await supabase
    .from('api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('id', keyRecord.id);

  next();
}

export function requireScope(scope) {
  return (req, res, next) => {
    if (!req.scopes || !req.scopes.includes(scope)) {
      return res.status(403).json({ error: `Forbidden. Required scope: ${scope}` });
    }
    next();
  };
}