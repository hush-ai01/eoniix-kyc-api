import rateLimit from 'express-rate-limit';

// Strict limiter for CASP registration — prevents registry spam
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per key/IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: { error: 'Too many registration attempts. Try again later.' }
});
