import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashKey(rawKey) {
  if (!process.env.API_KEY_SECRET) {
    throw new Error('API_KEY_SECRET is required for API key authentication.');
  }

  return crypto
    .createHmac('sha256', process.env.API_KEY_SECRET)
    .update(rawKey)
    .digest('hex');
}

function decodeStoredHash(raw) {
  if (!raw) return null;
  if (Buffer.isBuffer(raw)) return raw.toString('hex');
  const s = String(raw);
  if (s.startsWith('\\x')) return s.slice(2);
  return s;
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

  const storedHash = decodeStoredHash(data.key_hash);
  if (!storedHash || storedHash.length !== hash.length) return null;

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
    if (!valid) return null;
  } catch {
    return null;
  }

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

  supabase.from('api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {});

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
