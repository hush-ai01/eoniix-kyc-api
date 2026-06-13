# Sove Identity API

Identity and compliance infrastructure for Africa.
Built for fintechs, crypto exchanges, and financial platforms.

## API Reference

Full documentation available at [api.sove.africa/docs](https://api.sove.africa/docs)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| POST | /v1/verify | Full KYC verification |
| GET | /v1/credential/:id | Credential status |
| POST | /v1/credential/present | Verify once, carry forever |
| POST | /v1/identity/recover | Device loss recovery |
| POST | /v1/arc/send | Travel Rule transmission |
| POST | /v1/arc/receive | Receive Travel Rule payload |
| GET | /v1/arc/status/:id | Transmission status |
| POST | /v1/arc/casps/register | Register a CASP |
| GET | /v1/arc/casps/lookup | Lookup CASP by wallet |

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

## SDK

```bash
npm install sove-identity-sdk
```

## Supported Countries

| Country | Code | ID Types |
|---------|------|----------|
| Nigeria | NG | BVN, NIN, PASSPORT, DRIVERS_LICENSE |
| South Africa | ZA | NATIONAL_ID, PASSPORT |
| Kenya | KE | NATIONAL_ID, PASSPORT |
| Ghana | GH | DRIVERS_LICENSE |
| Uganda | UG | NATIONAL_ID |
| Zambia | ZM | NATIONAL_ID |

## Support

hello@sove.africa
