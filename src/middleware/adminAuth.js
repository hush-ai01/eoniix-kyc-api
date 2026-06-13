import logger from '../utils/logger.js';

// ✅ ONLY THESE KEYS CAN SEE INTERNAL INFRASTRUCTURE
// Add/remove collaborator keys here whenever you want
const ADMIN_KEYS = new Set([
  'sove_admin_2026_001_ULTRA_SECRET', // YOUR MAIN ADMIN KEY
  'dev_collab_john_002',               // Example: Developer 1
  'dev_collab_sarah_003'               // Example: Developer 2
  // ADD NEW COLLABORATORS HERE — REMOVE ANYTIME
]);

export function isAdminKey(req) {
  const key = req.headers['x-api-key'];
  return ADMIN_KEYS.has(key);
}

export function adminOnly(req, res, next) {
  if (isAdminKey(req)) return next();
  logger.warn('Unauthorized access attempt to admin area');
  return res.status(403).json({ success: false, message: 'Access denied' });
}

// ✅ MASK RESPONSE FOR NORMAL USERS, SHOW DETAILS FOR ADMINS
export function maskInternalData(req, res, next) {
  const originalJson = res.json;
  res.json = function(data) {
    // If NOT admin — REMOVE ALL INTERNAL TECH DETAILS
    if (!isAdminKey(req)) {
      // Rename fields
      if (data.credentialId) data.identityId = data.credentialId; delete data.credentialId;
      if (data.chain) delete data.chain;
      if (data.network) delete data.network;
      if (data.issuer) delete data.issuer;
      if (data.schema) delete data.schema;
      if (data.txSignature) delete data.txSignature;
      if (data.isMock) delete data.isMock;
      // Hide provider names
      if (data.provider) delete data.provider;
      if (data.rawResponse) delete data.rawResponse;
    }
    return originalJson.call(this, data);
  };
  next();
}
