// ─── errorHandler.js ──────────────────────────────────────────────────────────
export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${new Date().toISOString()} — ${req.method} ${req.path}`);
  console.error(err.message);

  // Dojah API errors
  if (err.response?.data) {
    return res.status(err.response.status || 502).json({
      error: 'Verification provider error.',
      detail: err.response.data
    });
  }

  // Known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({ error: err.message });
  }

  // Unknown errors — don't leak internals
  res.status(500).json({ error: 'Internal server error.' });
}
