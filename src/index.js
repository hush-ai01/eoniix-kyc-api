import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import verifyRouter from './routes/verify.js';
import keysRouter from './routes/keys.js';
import identityRouter from './routes/identity.js';
import credentialRouter from './routes/credential.js';
import healthRouter from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { trackUsage } from './middleware/usageTracker.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(trackUsage);

app.use(`/v1/*`, rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: { error: 'Too many requests. Please try again later.' }
}));

app.use('/health', healthRouter);
app.use('/v1/verify', verifyRouter);
app.use('/v1/credential', credentialRouter);
app.use('/v1/identity', identityRouter);
app.use('/v1/keys', keysRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🟢 Eoniix KYC API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Dojah mode:  ${process.env.DOJAH_ENV}\n`);
});

export default app;
