import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Sove Identity API',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    dojahMode: process.env.DOJAH_ENV
  });
});

export default router;
