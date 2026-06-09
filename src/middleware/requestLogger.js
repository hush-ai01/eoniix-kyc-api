import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      apiKey: req.headers['x-api-key']?.substring(0, 12) + '...'
    }, `${req.method} ${req.url} → ${res.statusCode} (${duration}ms)`);
  });
  next();
}
