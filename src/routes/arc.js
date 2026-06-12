
/**
 * @openapi
 * /v1/arc/send:
 *   post:
 *     summary: Send a Travel Rule transmission
 *     description: Initiates a FATF Travel Rule transmission between two CASPs. Automatically determines threshold based on ZAR amount.
 *     tags: [Travel Rule]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [originatorENumber, originatorWallet, beneficiaryWallet, beneficiaryCaspId, amountZar]
 *             properties:
 *               originatorENumber:
 *                 type: string
 *                 example: ENT-000001
 *               originatorWallet:
 *                 type: string
 *                 example: '0xabc123'
 *               beneficiaryWallet:
 *                 type: string
 *                 example: '0xdef456'
 *               beneficiaryCaspId:
 *                 type: string
 *                 example: casp_luno_za
 *               amountZar:
 *                 type: number
 *                 example: 5000
 *               chainTransactionRef:
 *                 type: string
 *                 example: 'tx_abc123'
 *     responses:
 *       200:
 *         description: Transmission sent successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: User not verified or beneficiary CASP not found
 */

/**
 * @openapi
 * /v1/arc/receive:
 *   post:
 *     summary: Receive a Travel Rule transmission
 *     description: Endpoint for beneficiary CASPs to receive incoming Travel Rule transmissions.
 *     tags: [Travel Rule]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               arcTransactionId:
 *                 type: string
 *               encryptedPayload:
 *                 type: string
 *               signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transmission received
 *       400:
 *         description: Missing required fields
 */

/**
 * @openapi
 * /v1/arc/status/{arcTransactionId}:
 *   get:
 *     summary: Get Travel Rule transmission status
 *     description: Returns the current status and details of a Travel Rule transmission.
 *     tags: [Travel Rule]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: arcTransactionId
 *         required: true
 *         schema:
 *           type: string
 *         example: arc_abc123
 *     responses:
 *       200:
 *         description: Transmission status returned
 *       404:
 *         description: Transaction not found
 */

/**
 * @openapi
 * /v1/arc/casps/register:
 *   post:
 *     summary: Register a CASP on the Sove Arc network
 *     description: Registers a new Virtual Asset Service Provider on the Sove Travel Rule network.
 *     tags: [Travel Rule]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [caspId, caspName, endpointUrl, publicKey, country]
 *             properties:
 *               caspId:
 *                 type: string
 *                 example: casp_luno_za
 *               caspName:
 *                 type: string
 *                 example: Luno South Africa
 *               endpointUrl:
 *                 type: string
 *                 example: https://api.luno.com/sove/arc
 *               publicKey:
 *                 type: string
 *               country:
 *                 type: string
 *                 example: ZA
 *               fscaLicensed:
 *                 type: boolean
 *                 example: true
 *               webhook_url:
 *                 type: string
 *                 example: https://api.luno.com/webhooks/sove
 *     responses:
 *       201:
 *         description: CASP registered successfully
 *       400:
 *         description: Missing required fields
 */

/**
 * @openapi
 * /v1/arc/casps/lookup:
 *   get:
 *     summary: Lookup a CASP by wallet address
 *     description: Find which CASP controls a given wallet address on the Sove Arc network.
 *     tags: [Travel Rule]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: wallet
 *         required: true
 *         schema:
 *           type: string
 *         example: '0xabc123'
 *     responses:
 *       200:
 *         description: CASP found
 *       404:
 *         description: CASP not found for wallet
 */
import express from 'express';
import { authenticate, requireScope } from '../middleware/authenticate.js';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();
router.use(authenticate);

import { determineThreshold, buildPayload, hashPayload, encryptPayload, signPayload, lookupVerifiedUser, storeTransmission, updateTransmissionStatus, getTransmission } from '../services/arcService.js';

import { getCaspById, getCaspByWallet, registerCasp } from '../services/caspRegistry.js';

// POST /v1/arc/send
router.post('/send', async (req, res) => {
  try {
    const { originatorENumber, originatorWallet, beneficiaryWallet, beneficiaryCaspId, amountZar, chainTransactionRef, originatorCaspId } = req.body;

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
      originatorCaspId: req.caspId || req.body.originatorCaspId,
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