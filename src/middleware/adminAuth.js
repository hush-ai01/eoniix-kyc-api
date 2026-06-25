import crypto from 'crypto';

import logger from '../utils/logger.js';

function adminKeys() {
  return new Set(
    (process.env.ADMIN_API_KEYS || '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
  );
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminKey(req) {
  const key = req.headers['x-api-key'];
  if (!key) return false;

  for (const adminKey of adminKeys()) {
    if (safeEqual(key, adminKey)) return true;
  }

  return false;
}

export function adminOnly(req, res, next) {
  if (isAdminKey(req)) return next();
  logger.warn('Unauthorized access attempt to admin area');
  return res.status(403).json({ success: false, message: 'Access denied' });
}

export function requireAdminToken(req, res, next) {
  const expectedToken = process.env.ADMIN_TOKEN;
  const token = req.headers['x-admin-token'];

  if (!expectedToken || !token || !safeEqual(token, expectedToken)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  return next();
}

export function maskInternalData(req, res, next) {
  const originalJson = res.json;

  res.json = function jsonWithMaskedInternals(data) {
    if (!isAdminKey(req) && data && typeof data === 'object') {
      const masked = { ...data };
      if (masked.credentialId) {
        masked.identityId = masked.credentialId;
        delete masked.credentialId;
      }
      delete masked.chain;
      delete masked.network;
      delete masked.issuer;
      delete masked.schema;
      delete masked.txSignature;
      delete masked.isMock;
      delete masked.provider;
      delete masked.rawResponse;
      return originalJson.call(this, masked);
    }

    return originalJson.call(this, data);
  };

  return next();
}
