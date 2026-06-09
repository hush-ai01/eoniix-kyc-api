import { v4 as uuidv4 } from 'uuid';

const IS_MOCK = !process.env.SOLANA_CREDENTIAL_ADDRESS;

export async function issueKYCCredential({ subjectDID, verificationData }) {
  const credentialId = `sove-${uuidv4()}`;

  if (IS_MOCK) {
    return {
      credentialId,
      attestationAddress: `mock-attestation-${credentialId}`,
      network: process.env.SOLANA_NETWORK || 'devnet',
      zkProofUrl: `https://attest.sove.placeholder/credentials/${credentialId}`
    };
  }

  return {
    credentialId,
    attestationAddress: null,
    network: process.env.SOLANA_NETWORK,
    zkProofUrl: `https://attest.sove.placeholder/credentials/${credentialId}`
  };
}

export async function getCredentialStatus(credentialId) {
  if (IS_MOCK) {
    return {
      credentialId,
      status: 'active',
      network: process.env.SOLANA_NETWORK || 'devnet',
      zkProofUrl: `https://attest.sove.placeholder/credentials/${credentialId}`
    };
  }

  return {
    credentialId,
    status: 'active',
    network: process.env.SOLANA_NETWORK,
    zkProofUrl: `https://attest.sove.placeholder/credentials/${credentialId}`
  };
}
