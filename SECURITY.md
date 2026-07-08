# 🔒 Sove Security Policy

## ✅ Active Protections
1. **API Key Segmentation** — Admin vs Client views, no internal data leakage
2. **Rate Limiting** — Global + per‑endpoint, blocks brute force
3. **Input Sanitisation** — Stops SQL/NoSQL/XSS/Command Injection
4. **CORS Whitelist** — Only your domains allowed
5. **HTTP Hardening** — HSTS, CSP, no sniff, no framing
6. **Attack Detection** — Blocks known malicious patterns instantly
7. **IP Blocking** — Permanent block for bad actors
8. **Encryption** — AES‑256‑GCM for stored sensitive data
9. **Audit Logging** — Every access logged, PII masked
10. **Zero Exposure** — Internal stack never sent to clients

## 📌 Rules
- Keys ≥ 20 chars, random only
- All endpoints require `x-api-key`
- No GET for write operations
- All data in transit TLS 1.3+ only
- Admin keys only shared with trusted developers
