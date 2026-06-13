import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'https://api.sove.africa';
const API_KEY = process.env.TEST_API_KEY || 'sove_live_71fb23a6593fe0a75deec6f3a42d354dadcdf56b093d39a9';
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

const TEST_CASP_ID = `casp_test_${Date.now()}`;

describe('POST /v1/arc/casps/register', () => {
  it('registers a new CASP successfully', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        caspId: TEST_CASP_ID,
        caspName: 'Test Exchange ZA',
        endpointUrl: 'https://test-exchange.co.za/arc',
        publicKey: 'test_pub_key_abc123',
        country: 'ZA',
        fscaLicensed: true
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.strictEqual(data.status, 'registered', `Unexpected status: ${data.status}`);
    assert.ok(data.caspId, 'Missing caspId in response');
    console.log('✅ CASP registration passed:', data.caspId);
  });

  it('rejects registration with missing fields', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ caspId: 'incomplete_casp' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Missing fields rejection passed');
  });
});

describe('POST /v1/arc/send', () => {
  it('rejects when beneficiary CASP not in registry', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        originatorENumber: 'ENT-000001',
        originatorWallet: '0xOriginator123',
        beneficiaryWallet: '0xBeneficiary456',
        beneficiaryCaspId: 'casp_nonexistent',
        originatorCaspId: TEST_CASP_ID,
        amountZar: 10000
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Unknown CASP rejection passed');
  });

  it('rejects when required fields are missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ originatorENumber: 'ENT-000001' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Missing fields rejection passed');
  });

  it('rejects when originator eNumber is not verified', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        originatorENumber: 'ENT-999999',
        originatorWallet: '0xOriginator123',
        beneficiaryWallet: '0xBeneficiary456',
        beneficiaryCaspId: TEST_CASP_ID,
        originatorCaspId: TEST_CASP_ID,
        amountZar: 10000
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Unverified originator rejection passed');
  });
});

describe('GET /v1/arc/status/:arcTransactionId', () => {
  it('returns 404 for unknown transaction', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/status/arc_nonexistent_123`, { headers });
    const data = await res.json();
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Unknown transaction 404 passed');
  });
});

describe('POST /v1/arc/receive', () => {
  it('rejects when required fields are missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/receive`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ arcTransactionId: 'arc_test_123' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Missing status rejection passed');
  });
});

describe('GET /v1/arc/casps/lookup', () => {
  it('returns 400 when wallet query param is missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/lookup`, { headers });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Missing wallet param rejection passed');
  });

  it('returns 404 for unknown wallet', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/lookup?wallet=0xUnknown999`, { headers });
    const data = await res.json();
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    console.log('✅ Unknown wallet 404 passed');
  });
});