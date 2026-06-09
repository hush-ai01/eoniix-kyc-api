const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 100;

export function rateLimitPerKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return next();

  const now = Date.now();
  const record = requestCounts.get(apiKey) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  record.count++;
  requestCounts.set(apiKey, record);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - record.count));
  res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());

  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Maximum 100 requests per 15 minutes per API key.'
    });
  }

  next();
}
