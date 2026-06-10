import express from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();

import { determineThreshold, buildPayload, hashPayload, encryptPayload, signPayload, lookupVerifiedUser, storeTransmission, updateTransmissionStatus, getTransmission } from '../services/arcService.js';

import { getCaspById, getCaspByWallet, registerCasp } from '../services/caspRegistry.js';

// POST /v1/arc/send
router.post('/send', async (req, res) => {
  try {
    const { originatorENumber, originatorWallet, beneficiaryWallet, beneficiaryCaspId, amountZar, chainTransactionRef } = req.body;

    if (!originatorENumber || !originatorWallet || !beneficiaryWallet || !beneficiaryCaspId || !amountZar) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const kycRecord = await lookupVerifiedUser(originatorENumber);
    if (!kycRecord) {
      return res.status(404).json({ error: 'User not found or verification incomplete' });
    }

    const beneficiaryCasp = await getCaspById(beneficiaryCaspId);
    if (!beneficiaryCasp) {
      return res.status(404).json({ error: 'Beneficiary CASP not found in Sove Arc registry' });
    }

    const threshold = determineThreshold(amountZar);
    const payload = buildPayload(kycRecord, originatorWallet, beneficiaryWallet, amountZar, threshold);
    const payloadHash = hashPayload(payload);
    const encryptedPayload = encryptPayload(payload, process.env.API_KEY_SECRET);
    const signature = signPayload(payloadHash);
    const arcTransactionId = `arc_${uuidv4()}`;

    await storeTransmission({
      arcTransactionId,
      originatorCaspId: req.caspId,
      beneficiaryCaspId,
      originatorEnumber: originatorENumber,
      originatorWallet,
      beneficiaryWallet,
      amountZar,
      chainTransactionRef,
      payloadHash,
      threshold
    });

    return res.status(200).json({
      status: 'transmitted',
      arcTransactionId,
      threshold,
      transmittedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('arc/send error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /v1/arc/receive
router.post('/receive', async (req, res) => {
  try {
    const { arcTransactionId, status } = req.body;
    if (!arcTransactionId || !status) {
      return res.status(400).json({ error: 'Missing arcTransactionId or status' });
    }
    await updateTransmissionStatus(arcTransactionId, status);
    return res.status(200).json({ status: 'received', receivedAt: new Date().toISOString() });
  } catch (err) {
    console.error('arc/receive error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /v1/arc/status/:arcTransactionId
router.get('/status/:arcTransactionId', async (req, res) => {
  try {
    const record = await getTransmission(req.params.arcTransactionId);
    if (!record) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    return res.status(200).json({
      arcTransactionId: record.arc_transaction_id,
      status: record.status,
      threshold: record.threshold,
      originatorCaspId: record.originator_casp_id,
      beneficiaryCaspId: record.beneficiary_casp_id,
      amountZar: record.amount_zar,
      transmittedAt: record.transmitted_at,
      receivedAt: record.received_at || null
    });
  } catch (err) {
    console.error('arc/status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /v1/arc/casps/register
router.post('/casps/register', async (req, res) => {
  try {
    const { caspId, caspName, endpointUrl, publicKey, country, fscaLicensed } = req.body;
    if (!caspId || !caspName || !endpointUrl || !publicKey || !country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const casp = await registerCasp({ caspId, caspName, endpointUrl, publicKey, country, fscaLicensed });
    return res.status(201).json({ status: 'registered', caspId: casp.casp_id });
  } catch (err) {
    console.error('arc/casps/register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /v1/arc/casps/lookup
router.get('/casps/lookup', async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) return res.status(400).json({ error: 'wallet query param required' });
    const casp = await getCaspByWallet(wallet);
    if (!casp) return res.status(404).json({ found: false });
    return res.status(200).json({ found: true, caspId: casp.casp_id, caspName: casp.casp_name, country: casp.country });
  } catch (err) {
    console.error('arc/casps/lookup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;