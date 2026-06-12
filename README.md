# Sove Identity API

Web3-native identity verification with on-chain verifiable credential output.
Built for African fintechs, crypto exchanges, and nano banks.

## Architecture

```
Client (B2B)
    │
    ▼
POST /v1/verify
    │
    ├─ Supabase ──── eNumber → DID lookup
    │
    ├─ Dojah ─────── Government ID verification
    │                Biometric liveness check
    │                AML watchlist screening
    │
    ├─ Solana Attestation Service ── Issue portable Sove identity credential on-chain
    │
    └─ Supabase ──── Store verification record
    │
    ▼
Response: { credentialId, zkProofUrl, amlClear, verifiedAt }
```

## Setup in GitHub Codespaces

### Step 1: Open in Codespaces
Push this repo to GitHub, then open in Codespaces. The devcontainer
auto-installs Node 20 and all dependencies.

### Step 2: Configure environment
```bash
cp .env.example .env
```
Fill in your values:
- Supabase URL and service key (from your existing project)
- Dojah App ID and Private Key (from app.dojah.io → API Keys)
- Solana network and credential addresses (devnet for pilots, mainnet for production)
- API Key Secret (generate any 32+ char random string)

### Step 3: Run the Supabase migration
Copy `supabase_migration.sql` and run it in your Supabase SQL editor.
**Important:** Coordinate with Don — if he has already created `enumber_did_mapping`,
compare schemas before running.

### Step 4: Start the server
```bash
npm run dev
```

### Step 5: Test the health endpoint
```bash
curl http://localhost:3000/health
```

### Step 6: Test a verification (sandbox mode)
```bash
curl -X POST http://localhost:3000/v1/verify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "eNumber": "EN-TEST-001",
    "country": "NG",
    "idType": "BVN",
    "idNumber": "12345678901",
    "selfieBase64": "base64-encoded-selfie-here"
  }'
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| POST | /v1/verify | Full KYC verification flow |
| GET | /v1/credential/:id | Fetch credential status + ZK proof |

## Authentication

All protected routes require the `x-api-key` header.
Issue unique keys to each B2B client.

## Adding Smile ID later

To add Smile ID as a second verification source:
1. Create `src/services/smileIdService.js` matching the same interface as `dojahService.js`
2. In `verify.js`, route by country:
   - Sub-Saharan Africa: Dojah (stronger telco data)
   - East/Southern Africa expansion: Smile ID (broader country coverage)

This is why the service layer is abstracted — zero changes to routes.

## Provider notes

**Dojah sandbox:** All API calls in sandbox mode use test data.
Get keys at https://app.dojah.io

**Solana:** Set SOLANA_NETWORK, SOLANA_CREDENTIAL_ADDRESS, and SOLANA_SCHEMA_ADDRESS in your .env before credential issuance works.
Don's eNumber-to-DID linking must be complete — the verify route will
return a 404 for any eNumber without a mapped DID.

## Supported countries and ID types

| Country | Code | Supported ID types |
|---------|------|-------------------|
| Nigeria | NG | BVN, NIN, PASSPORT, DRIVERS_LICENSE |
| South Africa | ZA | NATIONAL_ID, PASSPORT |
| Kenya | KE | NATIONAL_ID, PASSPORT |
| Ghana | GH | DRIVERS_LICENSE |

Add more in `dojahService.js → resolveIdEndpoint()` as you expand.
