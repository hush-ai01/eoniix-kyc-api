# Runtime and security hardening summary

This pass focused on fixes that make the API safer to run, easier to test, and clearer about production readiness.

## What changed

- Fixed API bootstrap by removing imports of missing modules and moving Express setup behind a `createApp()` function.
- Stopped the server from listening automatically during tests.
- Protected both `/admin` and `/v1/admin` with admin API-key middleware.
- Replaced hardcoded admin keys with `ADMIN_API_KEYS` and separated admin route tokens into `ADMIN_TOKEN`.
- Stopped storing generated partner API keys in plaintext when admin routes create keys.
- Added per-route scope checks for KYC verification and credential reads.
- Changed `/v1/verify` to fail closed when an eNumber has no linked DID instead of generating a placeholder DID.
- Changed per-key rate limiting to bucket by a SHA-256 digest instead of storing raw API keys in memory.
- Removed hardcoded live-looking test API keys and made live API checks opt-in through `TEST_BASE_URL` and `TEST_API_KEY`.
- Added local smoke tests for health and admin route protection.
- Updated `.env.example` with Solana-oriented wording and the new security variables.
- Ran non-breaking `npm audit fix`; remaining Solana transitive advisories need a separate breaking dependency upgrade decision.

## Validation

- `npm test`
- `npm audit fix`
- `npm audit --omit=dev --audit-level=high`

## Remaining follow-up

- Decide whether to migrate Solana dependencies to newer APIs to clear the remaining `@solana/web3.js` transitive advisories without relying on a breaking `npm audit fix --force`.
- Add mocked or sandboxed integration tests for Supabase, Dojah, and Solana credential issuance.
- Move the app fully out of sandbox/devnet mode before describing credentials as production credentials.
