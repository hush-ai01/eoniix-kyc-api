import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { requireAdminToken } from '../middleware/adminAuth.js';
import { sendCaspApprovalEmail } from '../services/emailService.js'; from '../middleware/adminAuth.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

// POST /admin/casp-requests/:id/approve
router.post('/casp-requests/:id/approve', requireAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Get the request
    const { data: request, error: fetchErr } = await supabase
      .from('casp_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ error: 'Already approved.' });
    }

    // 2. Generate API key
    const { raw, keyPrefix, hash } = generateApiKey('sove');

    // 3. Register as CASP
    const caspId = `casp_${Date.now()}`;
    await supabase.from('casp_registry').insert({
      casp_id: caspId,
      business_name: request.company_name,
      webhook_url: request.webhook_url || null,
      wallet_addresses: request.wallet_addresses ? [request.wallet_addresses] : []
    });

    // 4. Create API key
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await supabase.from('api_keys').insert({
      key: raw,
      key_prefix: keyPrefix,
      key_hash: hash,
      business_name: request.company_name,
      tier: 'pilot',
      status: 'active',
      scopes: ['kyc:verify', 'credential:issue', 'arc:send', 'arc:receive'],
      casp_id: caspId,
      expires_at: expiresAt.toISOString()
    });

    // 5. Update request status
    await supabase.from('casp_requests').update({
      status: 'approved',
      approved_at: new Date().toISOString()
    }).eq('id', id);

    return res.status(200).json({
      success: true,
      caspId,
      apiKey: raw,
      businessName: request.company_name,
      email: request.email,
      message: 'CASP approved and provisioned successfully.'
    });

  } catch (err) {
    console.error('admin/approve error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/casp-requests/:id/reject
router.post('/casp-requests/:id/reject', requireAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('casp_requests').update({
      status: 'rejected',
      rejected_at: new Date().toISOString()
    }).eq('id', id);
    return res.status(200).json({ success: true, message: 'Request rejected.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/casp-requests
router.get('/casp-requests', requireAdminToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('casp_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return res.status(200).json({ requests: data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
