# Supabase Integration

This directory contains the Supabase database migration and Edge Function for linking an eNative eNumber to an issuer-node DID.

## Files

- `migrations/20260515000001_create_enumbers_table.sql`: creates `public.enumbers`
- `functions/enumber_to_did/index.ts`: creates an issuer-node identity and stores the returned DID

## Setup

Required function secrets:

```bash
supabase secrets set SUPABASE_URL="<project-url>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set ISSUER_API_URL="https://issuer.example.com"
supabase secrets set ISSUER_API_AUTH_USER="<issuer-api-user>"
supabase secrets set ISSUER_API_AUTH_PASSWORD="<issuer-api-password>"
```

Optional DID configuration:

```bash
supabase secrets set ISSUER_DID_METHOD="solana"
supabase secrets set ISSUER_DID_BLOCKCHAIN="solana"
supabase secrets set ISSUER_DID_NETWORK="amoy"
supabase secrets set ISSUER_DID_KEY_TYPE="BJJ"
supabase secrets set ISSUER_CREDENTIAL_STATUS_TYPE="Iden3commRevocationStatusV1.0"
```

Local issuer-node testing may use HTTP only for local hosts:

```bash
supabase secrets set ISSUER_API_URL="http://host.docker.internal:3001"
supabase secrets set ALLOW_INSECURE_ISSUER_URL="true"
```

Apply and deploy:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy enumber_to_did
```

## Usage

The function expects a JSON payload with an `enumber_id`:

```json
{
  "enumber_id": "uuid-of-enumber-record"
}
```

The function:

- validates the request method and UUID
- fetches the `public.enumbers` row
- returns the existing DID when one is already stored
- creates an issuer-node identity through `POST /v2/identities`
- persists the DID only if the row still has no DID

Example response:

```json
{
  "did": "did:solana:devnet:...",
  "created": true
}
```
