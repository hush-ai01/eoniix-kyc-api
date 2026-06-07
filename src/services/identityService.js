import { supabase } from './supabaseService.js';
import { issueKYCCredential } from './polygonIdService.js';

export async function recoverIdentity({ enumber, newDID }) {
  // 1. Look up existing verified identity
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('enumber', enumber)
    .maybeSingle();

  if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
  if (!data) return null;

  // 2. Issue new credential to new DID
  const { credentialId } = await issueKYCCredential({
    subjectDID: newDID,
    verificationData: {
      idType: data.id_type,
      country: data.country,
      dateOfBirth: null
    }
  });

  // 3. Update Supabase — new DID, new credential, deprecate old
  const { error: updateError } = await supabase
    .from('kyc_verifications')
    .update({
      did: newDID,
      credential_id: credentialId,
      verified_at: new Date().toISOString(),
      reuse_count: 0,
      last_presented: null
    })
    .eq('enumber', enumber);

  if (updateError) throw new Error(`Recovery update failed: ${updateError.message}`);

  return { credentialId };
}
