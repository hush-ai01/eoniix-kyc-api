# Sove Identity API

**Travel Rule compliance and portable identity credentials for crypto asset service providers — built in Africa, for the world.**

Sove lets crypto exchanges (CASPs) meet FATF R16 / FIC Directive 9 Travel Rule obligations without becoming custodians of their users' identity data. Verify once, issue a portable on-chain credential, and transmit compliant data between exchanges — all through one API.

No rebuilding compliance infrastructure from scratch. No duplicate verification. No holding data you don't want liability for.

---

## Built for CASPs first

Crypto exchanges face a hard regulatory deadline: Travel Rule compliance for transactions between providers. Sove handles the sender/receiver transmission, CASP registration and lookup, and full transmission status tracking — so your compliance team isn't building this in-house.

The same credential layer that powers Travel Rule compliance also works as a standalone KYC and identity layer for **fintechs** who want faster onboarding without holding raw identity data themselves.

## What Sove does

| Capability | Description |
|---|---|
| **Travel Rule Compliance** | FATF R16 / FIC Directive 9 compliant transmission between crypto asset service providers |
| **KYC Verification** | ID + biometric verification across 6 African countries via a single endpoint |
| **Portable Credentials** | Verify once, carry forever. On-chain credentials on Solana that any platform can check |
| **Identity Recovery** | Users recover their verified identity after device loss without re-verifying |
| **SATMS Integration** | Pre-fill SARS traveller declarations directly from a verified Sove credential |
| **API Key Management** | Per-client scoped API keys with usage tracking, expiry, and revocation |

## Who it's for

- **Crypto exchanges (CASPs)** — Travel Rule compliance out of the box, without custody of counterpart data
- **Fintechs** — onboard users faster with pre-verified, portable identities

*Sove's credential infrastructure is also built to extend to government, travel, and healthcare use cases as it matures — reach out if you want to explore an early integration.*

## Supported countries

| Country | Code | ID Types |
|---|---|---|
| Nigeria | NG | BVN, NIN, PASSPORT, DRIVERS_LICENSE |
| South Africa | ZA | NATIONAL_ID, PASSPORT |
| Kenya | KE | NATIONAL_ID, PASSPORT |
| Ghana | GH | DRIVERS_LICENSE, PASSPORT |
| Uganda | UG | NATIONAL_ID |
| Zambia | ZM | NATIONAL_ID |

## Live API

Base URL: `https://api.sove.africa`

Full interactive docs: [api.sove.africa/docs](https://api.sove.africa/docs)

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health check |
| POST | `/v1/verify` | KYC verification — ID + biometric |
| GET | `/v1/credential/:id` | Credential status |
| POST | `/v1/credential/present` | Present a portable credential |
| POST | `/v1/identity/recover` | Recover identity after device loss |
| POST | `/v1/arc/send` | Send a Travel Rule transmission |
| POST | `/v1/arc/receive` | Receive a Travel Rule payload |
| GET | `/v1/arc/status/:id` | Transmission status |
| POST | `/v1/arc/casps/register` | Register a CASP |
| GET | `/v1/arc/casps/lookup` | Lookup CASP by wallet |
| POST | `/v1/satms` | Pre-fill SARS traveller declaration |
| POST | `/v1/keys` | API key management |
| POST | `/admin/keys/generate` | Generate a client API key |
| GET | `/admin/keys` | List all API keys |
| DELETE | `/admin/keys/:id/revoke` | Revoke an API key |

## Authentication

All protected routes require the `x-api-key` header.

\`\`\`bash
curl -X POST https://api.sove.africa/v1/verify \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "eNumber": "ENT-000001",
    "country": "NG",
    "idType": "BVN",
    "idNumber": "22222222222"
  }'
\`\`\`

## Stack

- **Runtime** — Node.js / Express on Render
- **Database** — Supabase (PostgreSQL)
- **Credential Layer** — Solana Attestation Service
- **Compliance Engine** — Sove ARC (Travel Rule)
- **SDK** — \`sove-identity-sdk\` (npm)

## SDK

\`\`\`bash
npm install sove-arc
\`\`\`

## Contact

hello@sove.africa

---

*Sove by Eoniix — Confidential*
