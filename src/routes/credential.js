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
