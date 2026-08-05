import { z } from 'zod';

const caspRegistrationSchema = z.object({
  caspId: z.string()
    .min(3, 'caspId must be at least 3 characters')
    .max(64, 'caspId must be at most 64 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'caspId may only contain letters, numbers, hyphens, and underscores'),
  caspName: z.string()
    .min(2, 'caspName must be at least 2 characters')
    .max(128, 'caspName must be at most 128 characters'),
  endpointUrl: z.string()
    .url('endpointUrl must be a valid URL')
    .refine((url) => url.startsWith('https://'), 'endpointUrl must use https://'),
  publicKey: z.string()
    .min(32, 'publicKey looks too short to be valid')
    .max(2048, 'publicKey is too long'),
  country: z.string()
    .length(2, 'country must be a 2-letter ISO code')
    .regex(/^[A-Z]{2}$/, 'country must be an uppercase 2-letter ISO code (e.g. ZA)'),
  fscaLicensed: z.boolean({
    required_error: 'fscaLicensed is required',
    invalid_type_error: 'fscaLicensed must be true or false'
  }),
  walletAddresses: z.array(
    z.string().min(10, 'wallet address looks too short').max(128, 'wallet address is too long')
  ).min(1, 'at least one wallet address is required').max(20, 'too many wallet addresses')
});

export function validateCaspRegistration(req, res, next) {
  const result = caspRegistrationSchema.safeParse(req.body);
  if (!result.success) {
    const issues = result.error?.issues ?? [];
    const errors = issues.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.body = result.data;
  next();
}
