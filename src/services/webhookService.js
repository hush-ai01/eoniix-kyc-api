import crypto from 'crypto';

export async function fireWebhook(webhookUrl, event, payload) {
  if (!webhookUrl) return;

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload
  });

  const signature = crypto
    .createHmac('sha256', process.env.API_KEY_SECRET)
    .update(body)
    .digest('hex');

  try {
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
    console.log(`Webhook fired: ${event} → ${webhookUrl} (${res.status})`);
  } catch (err) {
    console.error(`Webhook failed: ${event} → ${webhookUrl}`, err.message);
  }
}
