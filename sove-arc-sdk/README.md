# sove-arc

Official JavaScript SDK for the Sove Arc Travel Rule API.

Sove Arc enables FIC Directive 9 / FATF Recommendation 16 compliant Travel Rule
transmissions between Crypto Asset Service Providers (CASPs) operating in Africa.

## Installation

```bash
npm install sove-arc
```

## Quick start

```javascript
import { SoveArc } from 'sove-arc';

const sove = new SoveArc({ apiKey: 'your_api_key' });

// Send a Travel Rule payload
const result = await sove.send({
  originatorENumber: 'ENT-000001',
  originatorWallet: '0xOriginatorWalletAddress',
  beneficiaryWallet: '0xBeneficiaryWalletAddress',
  beneficiaryCaspId: 'casp_quidax_001',
  originatorCaspId: 'casp_your_id',
  amountZar: 15000
});

console.log(result.arcTransactionId);
console.log(result.threshold); // 'full' or 'reduced'

// Check transmission status
const status = await sove.status(result.arcTransactionId);
console.log(status.status); // 'sent', 'received', or 'failed'
```

## Methods

### `sove.send(payload)`
Transmits a Travel Rule payload to a beneficiary CASP.
Automatically applies full or reduced payload based on ZAR 5,000 threshold.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| originatorENumber | string | Yes | Sove eNumber of the sending user |
| originatorWallet | string | Yes | Originator wallet address |
| beneficiaryWallet | string | Yes | Beneficiary wallet address |
| beneficiaryCaspId | string | Yes | Registered CASP ID of the receiving exchange |
| originatorCaspId | string | Yes | Your registered CASP ID |
| amountZar | number | Yes | Transaction amount in ZAR |
| chainTransactionRef | string | No | On-chain transaction reference |

### `sove.status(arcTransactionId)`
Returns the current status of a transmission.

### `sove.receive({ arcTransactionId, status })`
Acknowledge receipt of an inbound transmission from another CASP.

### `sove.registerCasp({ caspId, caspName, endpointUrl, publicKey, country, fscaLicensed })`
Register your exchange with Sove Arc. Requires manual activation by Sove.

### `sove.lookupWallet(walletAddress)`
Look up which CASP owns a given wallet address.

## Error handling

```javascript
import { SoveArc, SoveArcError } from 'sove-arc';

try {
  await sove.send({ ... });
} catch (err) {
  if (err instanceof SoveArcError) {
    console.error(err.statusCode); // HTTP status
    console.error(err.message);    // Error message from API
  }
}
```

## Threshold logic

Sove Arc automatically determines payload type based on transaction amount:

- **ZAR 5,000 and above** — full payload (name, DOB, country of birth, Sove verification ID)
- **Below ZAR 5,000** — reduced payload (name and wallet addresses only)

This is handled server-side. No configuration needed.

## Base URL

Production: `https://api.sove.africa`

To use a custom base URL (staging, local):

```javascript
const sove = new SoveArc({
  apiKey: 'your_key',
  baseUrl: 'http://localhost:3000'
});
```

---

Built by Sove · Africa-native identity infrastructure · sove.africa