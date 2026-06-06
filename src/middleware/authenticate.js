/**
 * authenticate middleware
 * Validates the x-api-key header on all protected routes.
 * Your B2B clients include this key in every request.
 */
export function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized. Provide a valid x-api-key header.'
    });
  }

  next();
}
