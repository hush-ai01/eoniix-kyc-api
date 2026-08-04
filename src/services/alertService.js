export async function sendFailureAlert({ arcTransactionId, originatorCaspId, beneficiaryCaspId, amountZar, lastError, retryCount }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not set — cannot send failure alert');
    return;
  }

  const text = [
    `🚨 *ARC transmission failed permanently*`,
    `*Transaction:* ${arcTransactionId}`,
    `*Originator CASP:* ${originatorCaspId}`,
    `*Beneficiary CASP:* ${beneficiaryCaspId}`,
    `*Amount (ZAR):* ${amountZar}`,
    `*Attempts:* ${retryCount}`,
    `*Last error:* ${lastError}`
  ].join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.error(`Slack alert failed: ${res.status} ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    console.error('Slack alert failed:', err.message);
  }
}
