import { supabase } from './supabaseService.js';

const SATMS_PORTAL_URL = 'https://tools.sars.gov.za/TravelerDeclaration';

/**
 * Build a SARS traveller declaration payload from a verified Sove credential.
 * The user has already been KYC verified — we pre-fill their declaration.
 */
export async function buildDeclarationPayload(enumber) {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('e_number', enumber)
    .maybeSingle();

  if (error) throw new Error(`Supabase lookup failed: ${error.message}`);
  if (!data) return null;

  return {
    enumber,
    verificationId: data.verification_id,
    credentialId: data.credential_id,
    country: data.country,
    idType: data.id_type,
    verifiedAt: data.verified_at,
    amlClear: data.aml_clear,
    declarationStatus: 'pre_filled',
    satmsPortalUrl: SATMS_PORTAL_URL,
    message: 'Your Sove verified identity has been used to pre-fill your SARS traveller declaration. Complete and submit at the SATMS portal.',
    instructions: {
      step1: 'Visit the SATMS portal or app',
      step2: 'Your identity details are pre-verified by Sove',
      step3: 'Declare your goods and currency',
      step4: 'Submit within 24 hours before departure'
    },
    compliance: {
      regulation: 'Customs and Excise Act 1964',
      mandatoryFrom: '2026-07-01',
      authority: 'South African Revenue Service (SARS)',
      requirement: 'All travellers entering or leaving South Africa must submit an online declaration before travel'
    }
  };
}

/**
 * Log a SATMS declaration attempt against the user's credential.
 */
export async function logDeclarationAttempt(enumber, status) {
  await supabase.from('api_usage').insert({
    api_key: 'satms-internal',
    endpoint: '/v1/satms/declare',
    status_code: status,
    country: 'ZA',
    created_at: new Date().toISOString()
  });
}
