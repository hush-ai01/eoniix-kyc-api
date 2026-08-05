import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function attemptWebhook(webhookUrl, body, signature, event) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sove-Signature': `sha256=${signature}`,
      'X-Sove-Event': event
    },
    body,
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}: ${await res.text().catch(() => '')}`);
  }
  return res;
}

export async function fireWebhook(webhookUrl, event, payload) {
  if (!webhookUrl) throw new Error('Missing webhookUrl');

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload
  });

  const signature = crypto
    .createHmac('sha256', process.env.API_KEY_SECRET)
    .update(body)
    .digest('hex');

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await attemptWebhook(webhookUrl, body, signature, event);
      console.log(`Webhook fired: ${event} -> ${webhookUrl} (${res.status}) attempt ${attempt}`);
      return res;
    } catch (err) {
      lastError = err;
      console.warn(`Webhook attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }

  console.error(`Webhook permanently failed: ${event} -> ${webhookUrl} — ${lastError.message}`);

  await supabase.from('webhook_failures').insert({
    webhook_url: webhookUrl,
    event,
    payload,
    error: lastError.message,
    failed_at: new Date().toISOString()
  }).catch(e => console.error('Failed to log webhook failure:', e.message));

  throw lastError;
}
