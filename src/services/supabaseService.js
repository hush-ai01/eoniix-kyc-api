import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function getDIDByENumber(eNumber) {
  const { data, error } = await supabase
    .from('enumbers')
    .select('did')
    .eq('e_number', eNumber)
    .maybeSingle();

  if (error || !data?.did) return null;
  return data.did;
}

export async function getExistingVerification(eNumber) {
  const { data } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('e_number', eNumber)
    .maybeSingle();

  return data || null;
}

export async function storeVerificationRecord({
  eNumber, did, verificationId, country,
  idType, verifiedAt, amlClear, credentialId
}) {
  const { error } = await supabase
    .from('kyc_verifications')
    .insert({
      e_number: eNumber,
      did,
      verification_id: verificationId,
      country,
      id_type: idType,
      verified_at: verifiedAt,
      aml_clear: amlClear,
      credential_id: credentialId
    });

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
}

export async function updateCredentialId(verificationId, credentialId) {
  const { error } = await supabase
    .from('kyc_verifications')
    .update({ credential_id: credentialId })
    .eq('verification_id', verificationId);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}
