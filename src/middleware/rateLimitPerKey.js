import crypto from 'crypto';

const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000;

function maxRequests() {
  return parseInt(process.env.RATE_LIMIT_PER_KEY_MAX || '100', 10);
}

function bucketForApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function rateLimitPerKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return next();

  const now = Date.now();
  const bucket = bucketForApiKey(apiKey);
  const limit = maxRequests();
  const record = requestCounts.get(bucket) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  record.count++;
  requestCounts.set(bucket, record);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count));
  res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());

  if (record.count > limit) {
    return res.status(429).json({
      error: `Rate limit exceeded. Maximum ${limit} requests per 15 minutes per API key.`
    });
  }

  return next();
}
