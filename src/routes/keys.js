import express from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabaseService.js';

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { businessName, tier = 'starter', scopes = [], expiresInDays = 365 } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: 'businessName is required.' });
    }

    if (!process.env.API_KEY_SECRET) {
      return res.status(500).json({ error: 'Server misconfiguration: API_KEY_SECRET missing.' });
    }

    const rawKey = `en_${tier}_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 8);
    const keyHash = crypto
      .createHmac('sha256', process.env.API_KEY_SECRET)
      .update(rawKey)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const { error } = await supabase.from('api_keys').insert({
      key: rawKey,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      business_name: businessName,
      tier,
      status: 'active',
      scopes,
      expires_at: expiresAt.toISOString()
    });

    if (error) throw new Error(`Failed to create API key: ${error.message}`);

    res.status(201).json({
      apiKey: rawKey,
      keyPrefix,
      businessName,
      tier,
      scopes,
      expiresAt: expiresAt.toISOString(),
      message: 'Store this key securely. It will not be shown again.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
