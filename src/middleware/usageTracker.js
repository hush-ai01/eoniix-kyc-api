import { supabase } from '../services/supabaseService.js';

export async function trackUsage(req, res, next) {
  res.on('finish', async () => {
    try {
      await supabase.from('api_usage').insert({
        api_key: req.headers['x-api-key'] || 'unknown',
        business_name: req.business?.name || null,
        endpoint: req.originalUrl,
        country: req.body?.country || null,
        status_code: res.statusCode
      });
    } catch (err) {
      console.error('Usage tracking error:', err.message);
    }
  });
  next();
}
