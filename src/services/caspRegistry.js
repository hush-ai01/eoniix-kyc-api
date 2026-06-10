import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getCaspById(caspId) {
  const { data, error } = await supabase
    .from('casp_registry')
    .select('*')
    .eq('casp_id', caspId)
    .eq('active', true)
    .single();
  if (error || !data) return null;
  return data;
}

async function getCaspByWallet(walletAddress) {
  const { data, error } = await supabase
    .from('casp_registry')
    .select('*')
    .eq('active', true);
  if (error || !data) return null;
  return null;
}

async function registerCasp({ caspId, caspName, endpointUrl, publicKey, country, fscaLicensed }) {
  const { data, error } = await supabase
    .from('casp_registry')
    .insert({
      casp_id: caspId,
      casp_name: caspName,
      endpoint_url: endpointUrl,
      public_key: publicKey,
      country: country.toUpperCase(),
      fsca_licensed: fscaLicensed || false,
      active: false
    })
    .select()
    .single();
  if (error) throw new Error(`CASP registration failed: ${error.message}`);
  return data;
}

async function activateCasp(caspId) {
  const { error } = await supabase
    .from('casp_registry')
    .update({ active: true })
    .eq('casp_id', caspId);
  if (error) throw new Error(`CASP activation failed: ${error.message}`);
}

export { getCaspById, getCaspByWallet, registerCasp, activateCasp };