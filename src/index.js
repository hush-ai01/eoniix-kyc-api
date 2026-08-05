import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import verifyRouter from './routes/verify.js';
import keysRouter from './routes/keys.js';
import identityRouter from './routes/identity.js';
import credentialRouter from './routes/credential.js';
import healthRouter from './routes/health.js';
import adminRouter from './routes/admin.js';
import { buildArcRouter } from './lib/arcRouter.js';
import { authenticate } from './middleware/authenticate.js';
import { supabase } from './services/supabaseService.js';
import { startRetryDispatcher } from './services/retryDispatcher.js';
import satmsRouter from './routes/satms.js';
import arcRouter from './routes/arc.js';
import logger from './utils/logger.js';
import { swaggerSpec } from './swagger.js';
import { adminOnly } from './middleware/adminAuth.js';
import { rateLimitPerKey } from './middleware/rateLimitPerKey.js';
import { errorHandler } from './middleware/errorHandler.js';
import { trackUsage } from './middleware/usageTracker.js';
import { requestLogger } from './middleware/requestLogger.js';
import { blockIPs, detectAttacks } from './middleware/attackDetection.js';

const PORT = process.env.PORT || 3000;

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({
    origin: (origin, cb) => { const allowed = (process.env.CORS_ORIGIN || "").split(",").map(o => o.trim()).filter(Boolean); if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true); return cb(new Error("Not allowed by CORS")); },
    credentials: false
  }));
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10kb' }));
  app.use(requestLogger);
  app.use(blockIPs);
  app.use(detectAttacks);
  app.use(trackUsage);
  app.use('/v1', rateLimitPerKey);
  if (process.env.NODE_ENV !== 'production') { app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); } else { app.use('/docs', adminOnly, swaggerUi.serve, swaggerUi.setup(swaggerSpec)); }
  app.use('/health', healthRouter);
  app.use('/v1/verify', verifyRouter);
  app.use('/v1/credential', credentialRouter);
  app.use('/v1/identity', identityRouter);
  app.use('/v1/keys', keysRouter);
  app.use('/v1/arc', arcRouter);
  app.use('/v1/satms', satmsRouter);
  app.use('/admin', adminOnly, adminRouter);
  app.use('/v1/admin', adminOnly, adminRouter);

  app.get('/', (req, res) => {
    res.json({
      name: 'Sove Identity API',
      version: '1.0.0',
      description: 'Web3-native KYC verification with portable on-chain credentials. Built for African fintechs.',
      docs: '/docs',
      health: '/health',
      contact: 'hello@sove.africa'
    });
  });

  app.get('/admin/debug/stack', adminOnly, (req, res) => {
    res.json({
      identity_provider: 'Dojah',
      credential_layer: 'Solana Attestation Service',
      database: 'Supabase',
      compliance_engine: 'Sove ARC',
      sdk_package: 'sove-identity-sdk',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
  });

  app.use(errorHandler);

  return app;
}

const app = createApp();

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info('Sove Identity API running on port ' + PORT);
    startRetryDispatcher(supabase);
  });
}

export default app;
