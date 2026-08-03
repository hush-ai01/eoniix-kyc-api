import crypto from 'crypto';

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
}

export function createAuditLogger(supabase) {
  async function logEvent(entry) {
    const { error } = await supabase.from('arc_audit_log').insert({
      transmission_id: entry.transmissionId,
      event_type: entry.eventType,
      sender_casp: entry.senderCasp || null,
      receiver_casp: entry.receiverCasp || null,
      payload_hash: entry.payload ? hashPayload(entry.payload) : null,
      status: entry.status,
      error_reason: entry.errorReason || null,
      idempotency_key: entry.idempotencyKey || null
    });
    if (error) {
      console.error('[audit-log] failed to write audit entry', error, entry);
    }
  }

  async function upsertTransmissionStatus(transmissionId, patch) {
    const { error } = await supabase
      .from('arc_transmissions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', transmissionId);
    if (error) {
      console.error('[audit-log] failed to update transmission status', error, transmissionId);
    }
  }

  async function getHistory(transmissionId) {
    const { data, error } = await supabase
      .from('arc_audit_log')
      .select('*')
      .eq('transmission_id', transmissionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  return { logEvent, upsertTransmissionStatus, getHistory, hashPayload };
}

export { hashPayload };
