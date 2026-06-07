// ─── src/routes/credential.js ─────────────────────────────────────────────────
// GET /v1/credential/:credentialId — fetch credential status and ZK proof URL

import express from 'express';
import { getCredentialStatus } from '../services/polygonIdService.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

router.get('/:credentialId', authenticate, async (req, res, next) => {
  try {
    const { credentialId } = req.params;
    const status = await getCredentialStatus(credentialId);
    res.json({ credentialId, ...status });
  } catch (err) {
    next(err);
  }
});

export default router;

router.post('/present', authenticate, async (req, res, next) => {
  try {
    const { enumber } = req.body;
    if (!enumber) return res.status(400).json({ error: 'enumber is required.' });

    const { presentCredential } = await import('../services/supabaseService.js');
    const result = await presentCredential(enumber);

    if (!result) return res.status(404).json({ verified: false, message: 'No verified credential found for this eNumber.' });

    res.json(result);
  } catch (err) {
    next(err);
  }
});
