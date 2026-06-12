import crypto from 'crypto';
import { fireWebhook } from './webhookService.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ZAR_THRESHOLD = 5000;

function determineThreshold(amountZar) {
  return amountZar >= ZAR_THRESHOLD ? 'full' : 'reduced';
}

function buildPayload(kycRecord, originatorWallet, beneficiaryWallet, amountZar, threshold) {
  const base = {
    originatorFullName: `${kycRecord.first_name} ${kycRecord.last_name}`,
    originatorWallet,
    beneficiaryWallet,
    amountZar,
    threshold
  };
  if (threshold === 'full') {
    return {
      ...base,
      originatorDateOfBirth: kycRecord.date_of_birth || null,
      originatorCountryOfBirth: kycRecord.country_of_birth || null,
      soveVerificationId: kycRecord.verification_id
    };
  }
  return base;
}

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function encryptPayload(payload, secret) {
  const key = crypto.scryptSync(secret, 'sove_arc_salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function signPayload(payloadHash) {
  return crypto.createHmac('sha256', process.env.API_KEY_SECRET).update(payloadHash).digest('hex');
}

async function lookupVerifiedUser(enumber) {
  const { data, error } = await supabase
    .from('kyc_verifications')
    .select('*')
    .eq('e_number', enumber)
    .eq('status', 'verified')
    .single();
  if (error || !data) return null;
  return data;
}

async function storeTransmission({ arcTransactionId, originatorCaspId, beneficiaryCaspId, originatorEnumber, originatorWallet, beneficiaryWallet, amountZar, chainTransactionRef, payloadHash, threshold }) {
  const { error } = await supabase.from('travel_rule_records').insert({
    arc_transaction_id: arcTransactionId,
    originator_casp_id: originatorCaspId,
    beneficiary_casp_id: beneficiaryCaspId,
    originator_enumber: originatorEnumber,
    originator_wallet: originatorWallet,
    beneficiary_wallet: beneficiaryWallet,
    amount_zar: amountZar,
    chain_transaction_ref: chainTransactionRef || null,
    payload_hash: payloadHash,
    threshold,
    status: 'sent',
    transmitted_at: new Date().toISOString()
  });
  if (error) throw new Error(`Failed to store transmission: ${error.message}`);
}

async function updateTransmissionStatus(arcTransactionId, status) {
  const update = { status };
  const record = await getTransmission(arcTransactionId);
  if (record) {
    const { data: casp } = await supabase.from('casp_registry').select('webhook_url').eq('casp_id', record.originator_casp_id).single();
    if (casp && casp.webhook_url) {
      await fireWebhook(casp.webhook_url, 'arc.transmission.' + status, {
        arcTransactionId,
        status,
        originatorCaspId: record.originator_casp_id,
        beneficiaryCaspId: record.beneficiary_casp_id,
        amountZar: record.amount_zar
      });
    }
  }
  if (status === 'received') update.received_at = new Date().toISOString();
  const { error } = await supabase.from('travel_rule_records').update(update).eq('arc_transaction_id', arcTransactionId);
  if (error) throw new Error(`Failed to update status: ${error.message}`);
}

async function getTransmission(arcTransactionId) {
  const { data, error } = await supabase.from('travel_rule_records').select('*').eq('arc_transaction_id', arcTransactionId).single();
  if (error || !data) return null;
  return data;
}

export { determineThreshold, buildPayload, hashPayload, encryptPayload, signPayload, lookupVerifiedUser, storeTransmission, updateTransmissionStatus, getTransmission };