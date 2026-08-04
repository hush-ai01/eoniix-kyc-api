import cron from 'node-cron';
import { fireWebhook } from './webhookService.js';
import { sendFailureAlert } from './alertService.js';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 60_000; // 1 min

function backoffDelay(attempt) {
  return BASE_DELAY_MS * Math.pow(2, attempt); // 1,2,4,8,16 min
}

export async function processDueRetries(supabase) {
  const { data: due, error } = await supabase
    .from('travel_rule_records')
    .select('*')
    .in('delivery_status', ['pending', 'retrying'])
    .lte('next_retry_at', new Date().toISOString())
    .limit(20);

  if (error) throw error;

  for (const record of due || []) {
    try {
      const { data: casp } = await supabase
        .from('casp_registry')
        .select('endpoint_url')
        .eq('casp_id', record.originator_casp_id)
        .single();

      if (!casp || !casp.endpoint_url) {
        throw new Error('No webhook_url on CASP record');
      }

      await fireWebhook(casp.endpoint_url, 'arc.transmission.retry', {
        arcTransactionId: record.arc_transaction_id,
        status: record.current_status,
        originatorCaspId: record.originator_casp_id,
        beneficiaryCaspId: record.beneficiary_casp_id,
        amountZar: record.amount_zar
      });

      await supabase
        .from('travel_rule_records')
        .update({ delivery_status: 'sent', last_error: null })
        .eq('arc_transaction_id', record.arc_transaction_id);

    } catch (err) {
      const nextAttempt = record.retry_count + 1;

      if (nextAttempt >= MAX_ATTEMPTS) {
        await supabase
          .from('travel_rule_records')
          .update({
            delivery_status: 'failed',
            retry_count: nextAttempt,
            last_error: err.message
          })
          .eq('arc_transaction_id', record.arc_transaction_id);
        await sendFailureAlert({
          arcTransactionId: record.arc_transaction_id,
          originatorCaspId: record.originator_casp_id,
          beneficiaryCaspId: record.beneficiary_casp_id,
          amountZar: record.amount_zar,
          lastError: err.message,
          retryCount: nextAttempt
        });
      } else {
        await supabase
          .from('travel_rule_records')
          .update({
            delivery_status: 'retrying',
            retry_count: nextAttempt,
            next_retry_at: new Date(Date.now() + backoffDelay(nextAttempt)).toISOString(),
            last_error: err.message
          })
          .eq('arc_transaction_id', record.arc_transaction_id);
      }
    }
  }
}

export function startRetryDispatcher(supabase) {
  cron.schedule('* * * * *', () => {
    processDueRetries(supabase).catch(console.error);
  });
  console.log('ARC retry dispatcher started (checks every 60s)');
}
