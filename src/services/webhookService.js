import crypto from 'crypto';

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

  console.log(`Webhook fired: ${event} → ${webhookUrl} (${res.status})`);
  return res;
}
