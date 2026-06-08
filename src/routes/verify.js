/**
 * POST /v1/verify
 *
 * The main KYC endpoint. Orchestrates:
 * 1. eNumber → DID lookup (Supabase)
 * 2. Government ID verification (Dojah)
 * 3. Biometric liveness check (Dojah)
 * 4. AML screening (Dojah)
 * 5. Credential issuance (Polygon ID)
 * 6. Record storage (Supabase)
 *
 * Request body:
 * {
 *   eNumber: string,          // required
 *   country: string,          // 'NG' | 'ZA' | 'KE' | 'GH'
 *   idType: string,           // 'BVN' | 'NIN' | 'NATIONAL_ID' | 'PASSPORT'
 *   idNumber: string,         // the ID document number
 *   selfieBase64: string,     // base64 encoded selfie image
 *   idImageBase64: string     // optional: base64 encoded ID document photo
 * }
 *
 * Response:
 * {
 *   status: 'verified' | 'failed',
 *   eNumber: string,
 *   verificationId: string,
 *   credentialId: string,
 *   zkProofUrl: string,       // Web3 platforms use this to verify on-chain
 *   amlClear: boolean,
 *   verifiedAt: string
 * }
 */

import express from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { verifyGovernmentId, verifyBiometric, screenAML } from '../services/dojahService.js';
import { getDIDByENumber, storeVerificationRecord, updateCredentialId, getExistingVerification } from '../services/supabaseService.js';
import { issueKYCCredential } from '../services/polygonIdService.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// Input validation schema
const verifySchema = Joi.object({
  eNumber:        Joi.string().required(),
  country:        Joi.string().valid('NG', 'ZA', 'KE', 'GH', 'UG', 'ZM').required(),
  idType:         Joi.string().valid('BVN', 'NIN', 'NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE').required(),
  idNumber:       Joi.string().required(),
  selfieBase64:   Joi.string().required(),
  idImageBase64:  Joi.string().optional()
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    // ── 1. Validate input ────────────────────────────────────────────────────
    const { error, value } = verifySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { eNumber, country, idType, idNumber, selfieBase64, idImageBase64 } = value;

    // ── 2. Check for existing verification (avoid duplicate charges) ─────────
    const existing = await getExistingVerification(eNumber);
    if (existing?.credential_id) {
      return res.json({
        status: 'already_verified',
        eNumber,
        verificationId: existing.verification_id,
        credentialId: existing.credential_id,
        verifiedAt: existing.verified_at,
        message: 'This eNumber already has a valid KYC credential.'
      });
    }

    // ── 3. Resolve eNumber → DID ─────────────────────────────────────────────
    const did = await getDIDByENumber(eNumber);
    if (!did) {
      return res.status(404).json({
        error: `No DID found for eNumber ${eNumber}. Has this user completed eNumber registration?`
      });
    }

    // ── 4. Verify government ID via Dojah ────────────────────────────────────
    const idResult = await verifyGovernmentId({ country, idType, idNumber });
    if (!idResult.verified) {
      return res.status(422).json({
        status: 'failed',
        reason: 'government_id_not_verified',
        eNumber
      });
    }

    // ── 5. Biometric liveness check ──────────────────────────────────────────
    const bioResult = await verifyBiometric({ selfieBase64, idImageBase64 });
    if (!bioResult.verified) {
      return res.status(422).json({
        status: 'failed',
        reason: 'biometric_check_failed',
        eNumber,
        confidence: bioResult.confidence
      });
    }

    // ── 6. AML screening ─────────────────────────────────────────────────────
    const amlResult = await screenAML({
      firstName: idResult.data?.first_name,
      lastName:  idResult.data?.last_name,
      dateOfBirth: idResult.data?.date_of_birth
    });

    // Flag AML hits but don't auto-reject — your clients may want to handle this
    if (!amlResult.clear) {
      console.warn(`AML hit for eNumber ${eNumber}:`, amlResult.matches);
    }

    // ── 7. Issue Polygon ID verifiable credential ────────────────────────────
    const verificationId = uuidv4();
    const verifiedAt = new Date().toISOString();

    const { credentialId, zkProofUrl } = await issueKYCCredential({
      subjectDID: did,
      verificationData: {
        dateOfBirth: idResult.data?.date_of_birth,
        idType: idType === 'PASSPORT' ? 2 : 1
      }
    });

    // ── 8. Store the full record in Supabase ─────────────────────────────────
    await storeVerificationRecord({
      eNumber,
      did,
      verificationId,
      country,
      idType,
      verifiedAt,
      amlClear: amlResult.clear,
      credentialId
    });

    // ── 9. Return response to client ─────────────────────────────────────────
    return res.status(200).json({
      status: 'verified',
      eNumber,
      verificationId,
      credentialId,
      zkProofUrl,
      amlClear: amlResult.clear,
      verifiedAt,
      ...(amlResult.clear === false && {
        amlWarning: 'This user flagged on AML screening. Manual review recommended.'
      })
    });

  } catch (err) {
    next(err);
  }
});

export default router;
