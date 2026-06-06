/**
 * PolygonIDService
 * Issues W3C verifiable credentials via your Polygon ID issuer node.
 * Don's eNumber-to-DID linking feeds directly into this.
 */

import axios from 'axios';

const ISSUER_URL = process.env.POLYGON_ID_ISSUER_URL;
const ISSUER_DID = process.env.POLYGON_ID_ISSUER_DID;

const issuerClient = axios.create({
  baseURL: ISSUER_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

/**
 * Issue a KYC credential to a DID.
 * The credential encodes the verification result without exposing raw PII.
 *
 * @param {string} subjectDID - the user's did:polygonid identifier
 * @param {object} verificationData - result from Dojah
 * @returns {object} { credentialId, zkProofUrl }
 */
export async function issueKYCCredential({ subjectDID, verificationData }) {
  const credentialRequest = {
    credentialSchema:
      'https://raw.githubusercontent.com/iden3/claim-schema-vocab/main/schemas/json/KYCAgeCredential-v3.json',
    type: 'KYCAgeCredential',
    credentialSubject: {
      id: subjectDID,
      birthday: formatBirthday(verificationData.dateOfBirth),
      documentType: verificationData.idType || 1
    },
    expiration: getExpiryDate(365), // 1 year credential validity
    revNonce: Math.floor(Math.random() * 1000000)
  };

  const response = await issuerClient.post(
    `/v1/${encodeURIComponent(ISSUER_DID)}/claims`,
    credentialRequest
  );

  const credentialId = response.data?.id;

  if (!credentialId) {
    throw new Error('Polygon ID issuer returned no credential ID.');
  }

  // Build the ZK proof URL — this is what Web3 platforms use to verify on-chain
  const zkProofUrl = `${ISSUER_URL}/v1/${encodeURIComponent(ISSUER_DID)}/claims/${credentialId}/qrcode`;

  return { credentialId, zkProofUrl };
}

/**
 * Get the status of an issued credential.
 */
export async function getCredentialStatus(credentialId) {
  const response = await issuerClient.get(
    `/v1/${encodeURIComponent(ISSUER_DID)}/claims/${credentialId}`
  );
  return response.data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBirthday(dobString) {
  // Polygon ID expects birthday as integer YYYYMMDD
  if (!dobString) return 0;
  return parseInt(dobString.replace(/-/g, '').substring(0, 8));
}

function getExpiryDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}
