import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const apiKey = req.headers['x-api-key'];

    logger.info({
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ...(apiKey && { apiKey: `${apiKey.substring(0, 12)}...` })
    }, `${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${duration}ms)`);
  });

  return next();
}
