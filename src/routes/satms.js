import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { buildDeclarationPayload, logDeclarationAttempt } from '../services/satmsService.js';

const router = express.Router();

/**
 * POST /v1/satms/declare
 * Pre-fill a SARS traveller declaration from a verified Sove credential.
 */
router.post('/declare', authenticate, async (req, res, next) => {
  try {
    const { enumber } = req.body;
    if (!enumber) {
      return res.status(400).json({ error: 'enumber is required.' });
    }

    const payload = await buildDeclarationPayload(enumber);

    if (!payload) {
      return res.status(404).json({
        error: 'No verified Sove credential found for this eNumber. Complete KYC verification first.'
      });
    }

    await logDeclarationAttempt(enumber, 200);

    res.json({
      success: true,
      declaration: payload
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /v1/satms/info
 * Returns information about the SARS mandatory declaration requirement.
 */
router.get('/info', async (req, res) => {
  res.json({
    regulation: 'SARS Online Traveller Declaration',
    mandatoryFrom: '2026-07-01',
    authority: 'South African Revenue Service (SARS)',
    applies_to: 'All travellers entering or leaving South Africa by air, land, sea or rail',
    deadline: 'Must be submitted within 24 hours before departure',
    portal: 'https://tools.sars.gov.za/TravelerDeclaration',
    app: 'South African Traveller Management System (SATMS)',
    sove_integration: 'Sove verified identity pre-fills your declaration automatically'
  });
});

export default router;
