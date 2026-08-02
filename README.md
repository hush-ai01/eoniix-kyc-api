# Sove Identity API

*Plug-and-play identity and compliance infrastructure. Verify once. Use everywhere.*

Sove is a B2B identity API that lets any platform — fintech, government, airport, healthcare, or enterprise — verify who their users are, issue portable credentials, and stay compliant. No rebuilding KYC from scratch. No duplicate verification. One API call.

Built in Africa. Built for the world.

---

## What Sove does

| Capability | Description |
|------------|-------------|
| KYC Verification | ID + biometric verification across 6 African countries via a single endpoint |
| Portable Credentials | Verify once, carry forever. On-chain credentials on Solana that any platform can check |
| Identity Recovery | Users recover their verified identity after device loss without re-verifying |
| Travel Rule Compliance | FATF R16 / FIC Directive 9 compliant transmission between crypto asset service providers |
| SATMS Integration | Pre-fill SARS traveller declarations directly from a verified Sove credential |
| API Key Management | Per-client scoped API keys with usage tracking, expiry, and revocation |

---

## Who it's for

- **Fintechs** — onboard users faster with pre-verified identities
- **Crypto exchanges (CASPs)** — Travel Rule compliance out of the box
- **Governments** — portable citizen identity for digital services
- **Airports & border control** — traveller verification and declaration pre-fill
- **Healthcare platforms** — verified patient identity across providers
- **Any platform** — that needs to know who their users are without building it themselves

---

## Supported countries

| Country | Code | ID Types |
|---------|------|----------|
| Nigeria | NG | BVN, NIN, PASSPORT, DRIVERS_LICENSE |
| South Africa | ZA | NATIONAL_ID, PASSPORT |
| Kenya | KE | NATIONAL_ID, PASSPORT |
| Ghana | GH | DRIVERS_LICENSE, PASSPORT |
| Uganda | UG | NATIONAL_ID |
| Zambia | ZM | NATIONAL_ID |

---

## Live API

Base URL: `https://api.sove.africa`

Full interactive docs: [api.sove.africa/docs](https://api.sove.africa/docs)

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| POST | /v1/verify | KYC verification — ID + biometric |
| GET | /v1/credential/:id | Credential status |
| POST | /v1/credential/present | Present a portable credential |
| POST | /v1/identity/recover | Recover identity after device loss |
| POST | /v1/arc/send | Send a Travel Rule transmission |
| POST | /v1/arc/receive | Receive a Travel Rule payload |
| GET | /v1/arc/status/:id | Transmission status |
| POST | /v1/arc/casps/register | Register a CASP |
| GET | /v1/arc/casps/lookup | Lookup CASP by wallet |
| POST | /v1/satms | Pre-fill SARS traveller declaration |
| POST | /v1/keys | API key management |
| POST | /admin/keys/generate | Generate a client API key |
| GET | /admin/keys | List all API keys |
| DELETE | /admin/keys/:id/revoke | Revoke an API key |

---

## Authentication

All protected routes require the `x-api-key` header.

```bash
curl -X POST https://api.sove.africa/v1/verify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "eNumber": "ENT-000001",
    "country": "NG",
    "idType": "BVN",
    "idNumber": "22222222222"
  }'
```

---

## Stack

- **Runtime** — Node.js / Express on Render
- **Database** — Supabase (PostgreSQL)
- **Identity Provider** — Dojah
- **Credential Layer** — Solana Attestation Service
- **Compliance Engine** — Sove ARC (Travel Rule)
- **SDK** — sove-identity-sdk (npm)

---

## SDK

```bash
npm install sove-arc
```

---

## Contact

hello@sove.africa

---

*Sove by Eoniix — Confidential*
