import logger from '../utils/logger.js';
import { isAdminKey } from './adminAuth.js';

const suspiciousPatterns = [
  /(\$|\/\*|\*\/|SELECT|INSERT|DROP|UNION|OR\s+1=1)/i, // SQL/NoSQL
  /(<script|javascript:|onload=|onerror=)/i, // XSS
  /(\.\.\/|\/etc\/|\/proc\/|\/root\/)/i, // Path traversal
  /(wget|bash|sh|nc|python|perl)/i // Command injection
];

export function detectAttacks(req, res, next) {
  const data = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(data)) {
      logger.error('⚠️ SUSPICIOUS ACTIVITY DETECTED', {
        ip: req.ip,
        path: req.path,
        pattern: pattern.toString(),
        key: req.headers['x-api-key']?.substring(0,8)
      });
      // Block immediately — return 403
      return res.status(403).json({ success: false, message: 'Request blocked' });
    }
  }

  // Block requests without proper Accept/Content-Type
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({ success: false, message: 'Only JSON allowed' });
  }

  next();
}

// Block known malicious IPs (add here as you find them)
const blockedIPs = new Set(['192.168.0.99', '10.0.0.88']);
export function blockIPs(req, res, next) {
  if (blockedIPs.has(req.ip)) {
    logger.warn(`Blocked IP: ${req.ip}`);
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
}
