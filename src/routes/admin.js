import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { requireAdminToken } from '../middleware/adminAuth.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function generateApiKey(prefix = 'sove') {
  if (!process.env.API_KEY_SECRET) {
    throw new Error('API_KEY_SECRET is required to generate API keys.');
  }

  const raw = `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
  const keyPrefix = raw.slice(0, 8);
  const hash = crypto
    .createHmac('sha256', process.env.API_KEY_SECRET)
    .update(raw)
    .digest('hex');
  return { raw, keyPrefix, hash };
}

// POST /admin/keys/generate
router.post('/keys/generate', requireAdminToken, async (req, res) => {
  try {
    const { businessName, caspId, scopes, expiresInDays } = req.body;
    if (!businessName) {
      return res.status(400).json({ error: 'businessName is required' });
    }

    const { raw, keyPrefix, hash } = generateApiKey();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        business_name: businessName,
        key_prefix: keyPrefix,
        key_hash: hash,
        casp_id: caspId || null,
        scopes: scopes || ['arc:send', 'arc:receive'],
        status: 'active',
        is_active: true,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return res.status(201).json({
      message: 'API key generated. Store this key securely — it will not be shown again.',
      apiKey: raw,
      keyPrefix,
      businessName,
      caspId: caspId || null,
      scopes: scopes || ['arc:send', 'arc:receive'],
      expiresAt
    });

  } catch (err) {
    console.error('admin/keys/generate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/keys
router.get('/keys', requireAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, business_name, key_prefix, casp_id, scopes, status, is_active, created_at, last_used, expires_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return res.status(200).json({ keys: data });
  } catch (err) {
    console.error('admin/keys error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/keys/:id/revoke
router.delete('/keys/:id/revoke', requireAdminToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked', is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw new Error(error.message);
    return res.status(200).json({ message: 'Key revoked.' });
  } catch (err) {
    console.error('admin/keys/revoke error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
