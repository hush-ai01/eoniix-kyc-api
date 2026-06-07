import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function getDIDByENumber(eNumber) {
  const { data, error } = await supabase
    .from('enumbers')
    .select('did')
    .eq('enumber', eNumber)
    .maybeSingle();

  if (error || !data?.did) return null;
  return data.did;
}

export async function getExistingVerification(eNumber) {
  const { data } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('enumber', eNumber)
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
      enumber: eNumber,
      did,
      verification_id: verificationId,
      country,
      id_type: idType,
      verified_at: verifiedAt,
      aml_clear: amlClear,
      credential_id: credentialId,
      verification_level: verificationLevel || 1,
      reuse_count: 0,
      last_presented: new Date().toISOString()
    });

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
}

export async function updateCredentialId(verificationId, credentialId) {
  const { error } = await supabase
    .from('kyc_verifications')
    .update({ credential_id: credentialId,
      verification_level: verificationLevel || 1,
      reuse_count: 0,
      last_presented: new Date().toISOString() })
    .eq('verification_id', verificationId);

  if (error) throw new Error(`Supabase update failed: ${error.message}`);
}

export async function presentCredential(enumber) {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('credential_id, verification_level, aml_clear, verified_at, reuse_count')
    .eq('enumber', enumber)
    .maybeSingle();

  if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
  if (!data) return null;

  await supabase
    .from('kyc_verifications')
    .update({
      reuse_count: (data.reuse_count || 0) + 1,
      last_presented: new Date().toISOString()
    })
    .eq('enumber', enumber);

  return {
    verified: true,
    credentialId: data.credential_id,
    verificationLevel: data.verification_level,
    amlClear: data.aml_clear,
    verifiedAt: data.verified_at,
    reuseCount: (data.reuse_count || 0) + 1
  };
}
