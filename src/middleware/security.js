import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { isAdminKey } from './adminAuth.js';
import logger from '../utils/logger.js';

// --- 1. HTTP Headers Protection ---
export function securityHeaders(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://sove.africa']
      }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' }
  }));
}

// --- 2. CORS Configuration — Restrict Origins ---
export function secureCors(app) {
  const allowedOrigins = [
    'https://sove.africa',
    'https://www.sove.africa',
    'http://localhost:3000' // dev only — remove in production
  ];
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key']
  }));
}

// --- 3. RATE LIMITING — Prevent Brute Force / Abuse ---
export function rateLimiter(app) {
  // Global limit
  const globalLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 1000, // 1000 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests — try again later' }
  });

  // Strict limit for sensitive endpoints
  const verifyLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 verifications per IP/hour
    message: { success: false, message: 'Verification rate limit reached' }
  });

  const adminLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Admin rate limit reached' }
  });

  app.use(globalLimit);
  app.use('/verify', verifyLimit);
  app.use('/admin/', adminLimit);
}

// --- 4. DATA SANITISATION — No SQL / NoSQL Injection ---
export function sanitiseData(app) {
  app.use(mongoSanitize()); // Remove $ . from query/body
  app.use(xss()); // Strip HTML/JS from inputs
  app.use(hpp()); // Prevent HTTP Parameter Pollution
}

// --- 5. API KEY VALIDATION — Hardened ---
export async function validateApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    logger.warn('Access attempt without API key', { ip: req.ip });
    return res.status(401).json({ success: false, message: 'Missing API key' });
  }

  // Block obviously invalid formats
  if (!/^[a-zA-Z0-9_\-]{20,64}$/.test(key)) {
    logger.warn('Invalid API key format', { ip: req.ip, key: key.substring(0,8)+'...' });
    return res.status(401).json({ success: false, message: 'Invalid key' });
  }

  // Check if revoked or expired (you can add DB lookup here)
  const revokedKeys = new Set(['revoked_example_key']);
  if (revokedKeys.has(key)) {
    logger.warn('Attempt with revoked key', { ip: req.ip });
    return res.status(403).json({ success: false, message: 'Key revoked' });
  }

  // Log every valid use
  if (isAdminKey(req)) {
    logger.info('Admin access', { ip: req.ip, key: key.substring(0,8) });
  } else {
    logger.info('Client access', { ip: req.ip, key: key.substring(0,8) });
  }

  next();
}

// --- 6. SENSITIVE DATA MASKING IN LOGS ---
export function maskLogs(app) {
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
      if (typeof body === 'string') {
        body = body.replace(/\b\d{13}\b/g, '[ID REDACTED]'); // SA ID
        body = body.replace(/\b\d{11}\b/g, '[BVN REDACTED]'); // BVN
      }
      return originalSend.call(this, body);
    };
    next();
  });
}
