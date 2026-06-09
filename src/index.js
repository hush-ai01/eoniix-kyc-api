import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import verifyRouter from './routes/verify.js';
import credentialRouter from './routes/credential.js';
import healthRouter from './routes/health.js';
import logger from './utils/logger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { rateLimitPerKey } from './middleware/rateLimitPerKey.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

app.use('/v1', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests. Please try again later.' }
}));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/health', healthRouter);
app.use('/v1', rateLimitPerKey);
app.use('/v1/verify', verifyRouter);
app.use('/v1/credential', credentialRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'Sove Identity API',
    version: '1.0.0',
    description: 'Web3-native KYC verification with portable on-chain credentials. Built for African fintechs.',
    docs: '/docs',
    health: '/health',
    contact: 'hello@sove.io'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Sove Identity API running on port ' + PORT);
  
  
});

export default app;
