import { v4 as uuidv4 } from 'uuid';

export async function issueKYCCredential({ subjectDID, verificationData }) {
  const credentialId = `cred-${uuidv4()}`;
  return {
    credentialId,
    zkProofUrl: `https://issuer.sove.io/credentials/${credentialId}/proof`
  };
}

export async function getCredentialStatus(credentialId) {
  return {
    credentialId,
    status: 'active',
    zkProofUrl: `https://issuer.sove.io/credentials/${credentialId}/proof`
  };
}
