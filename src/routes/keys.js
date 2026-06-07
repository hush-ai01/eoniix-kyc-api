import express from 'express';
import crypto from 'crypto';
import { supabase } from '../services/supabaseService.js';

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  try {
    const { businessName, tier = 'starter' } = req.body;

    if (!businessName) {
      return res.status(400).json({ error: 'businessName is required.' });
    }

    const apiKey = `en_${tier}_${crypto.randomBytes(24).toString('hex')}`;

    const { error } = await supabase.from('api_keys').insert({
      key: apiKey,
      business_name: businessName,
      tier
    });

    if (error) throw new Error(`Failed to create API key: ${error.message}`);

    res.status(201).json({
      apiKey,
      businessName,
      tier,
      message: 'Store this key securely. It will not be shown again.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
