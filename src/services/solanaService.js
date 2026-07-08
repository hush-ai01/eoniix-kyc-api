import { v4 as uuidv4 } from 'uuid';

const IS_MOCK = !process.env.SOLANA_CREDENTIAL_ADDRESS;

export async function issueKYCCredential({ subjectDID, verificationData }) {
  const credentialId = `sove-${uuidv4()}`;

  if (IS_MOCK) {
    return {
    provider: "Sove",
    credentialLayer: "Solana",
      credentialId,
      attestationAddress: `mock-attestation-${credentialId}`,
      network: process.env.SOLANA_NETWORK || 'devnet',
      zkProofUrl: `https://attest.sove.africa/credentials/${credentialId}`
    };
  }

  return {
    provider: "Sove",
    credentialLayer: "Solana",
    credentialId,
    attestationAddress: null,
    network: process.env.SOLANA_NETWORK,
    zkProofUrl: `https://attest.sove.africa/credentials/${credentialId}`
  };
}

export async function getCredentialStatus(credentialId) {
  if (IS_MOCK) {
    return {
    provider: "Sove",
    credentialLayer: "Solana",
      credentialId,
      status: 'active',
      network: process.env.SOLANA_NETWORK || 'devnet',
      zkProofUrl: `https://attest.sove.africa/credentials/${credentialId}`
    };
  }

  return {
    provider: "Sove",
    credentialLayer: "Solana",
    credentialId,
    status: 'active',
    network: process.env.SOLANA_NETWORK,
    zkProofUrl: `https://attest.sove.africa/credentials/${credentialId}`
  };
}
