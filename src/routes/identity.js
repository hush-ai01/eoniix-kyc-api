import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { recoverIdentity } from '../services/identityService.js';

const router = express.Router();

router.post('/recover', authenticate, async (req, res, next) => {
  try {
    const { enumber, newDID } = req.body;

    if (!enumber) return res.status(400).json({ error: 'enumber is required.' });
    if (!newDID) return res.status(400).json({ error: 'newDID is required.' });

    const result = await recoverIdentity({ enumber, newDID });

    if (!result) return res.status(404).json({ error: 'No verified identity found for this eNumber.' });

    res.json({
      recovered: true,
      enumber,
      newDID,
      credentialId: result.credentialId,
      message: 'Identity successfully recovered. New credential issued to new DID.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
