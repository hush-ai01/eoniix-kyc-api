// lib/auditLog.js
//
// Every ARC transmission event gets one row here. This is the thing you
// export and hand to a compliance officer or regulator — never store raw
// PII or transaction payloads in this table, only a hash of them, so the
// audit trail itself doesn't become a second copy of sensitive data.

const crypto = require('crypto');

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
function createAuditLogger(supabase) {
  /**
   * @param {object} entry
   * @param {string} entry.transmissionId
   * @param {string} entry.eventType - 'send_initiated' | 'send_delivered' | 'send_failed' | 'receive_accepted' | 'receive_rejected' | 'status_check'
   * @param {string} [entry.senderCasp]
   * @param {string} [entry.receiverCasp]
   * @param {object} [entry.payload] - raw payload, will be hashed, never stored raw
   * @param {string} entry.status - 'pending' | 'delivered' | 'failed' | 'rejected'
   * @param {string} [entry.errorReason]
   * @param {string} [entry.idempotencyKey]
   */
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
      // Audit logging failing silently is worse than the original error —
      // surface it loudly (replace with your real logging/alerting).
      console.error('[audit-log] failed to write audit entry', error, entry);
    }
  }

  /**
   * Keeps the fast-lookup arc_transmissions row in sync with the latest event.
   * Call this alongside logEvent whenever a transmission's status changes.
   */
  async function upsertTransmissionStatus(transmissionId, patch) {
    const { error } = await supabase
      .from('arc_transmissions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', transmissionId);

    if (error) {
      console.error('[audit-log] failed to update transmission status', error, transmissionId);
    }
  }

  /**
   * Full event history for one transmission, oldest first —
   * this is what you'd export for a regulator or a customer's compliance team.
   */
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

module.exports = { createAuditLogger, hashPayload };
