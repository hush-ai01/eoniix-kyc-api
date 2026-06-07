import { supabase } from '../services/supabaseService.js';

export async function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid x-api-key header.' });
  }

  // Validate key against database
  const { data, error } = await supabase
    .from('api_keys')
    .select('key, business_name, tier, is_active')
    .eq('key', apiKey)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or inactive API key.' });
  }

  // Attach business info to request
  req.business = {
    name: data.business_name,
    tier: data.tier,
    apiKey
  };

  // Update last_used
  await supabase
    .from('api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('key', apiKey);

  next();
}
