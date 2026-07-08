export const internalSwaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Sove — INTERNAL ADMIN API',
    version: '1.0.0',
    description: `🔒 **RESTRICTED ACCESS ONLY**
    
Full internal infrastructure details — visible only to authorised collaborators.

• Identity Provider: Dojah
• Credential Layer: Solana Attestation Service
• Database: Supabase (PostgreSQL)
• Compliance Engine: Custom ARC / Travel Rule Module
• SDK: @sove/identity-sdk

⚠️ DO NOT SHARE THIS DOCUMENTATION WITH CLIENTS`
  },
  servers: [{ url: 'https://sove.africa/v1', description: 'Production' }],
  components: {
    securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } }
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/verify': {
      post: {
        summary: 'Verify User (Internal View)',
        description: 'Flow: Receive data → Dojah lookup → AML check → Solana attestation → Store in Supabase',
        responses: { 200: { description: 'Full response includes: credentialId, chain, network, provider, rawData' } }
      }
    }
  }
};
