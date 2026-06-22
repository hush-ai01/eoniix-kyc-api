import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL;
const API_KEY = process.env.TEST_API_KEY;
const liveIt = BASE_URL && API_KEY ? it : it.skip;

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  };
}

const TEST_CASP_ID = `casp_test_${Date.now()}`;

describe('POST /v1/arc/casps/register live checks', () => {
  liveIt('registers a new CASP successfully', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/register`, {
      method: 'POST',
      headers: headers(),
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

    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.equal(data.status, 'registered');
    assert.ok(data.caspId, 'Missing caspId in response');
  });

  liveIt('rejects registration with missing fields', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ caspId: 'incomplete_casp' })
    });
    const data = await res.json();

    assert.equal(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
  });
});

describe('POST /v1/arc/send live checks', () => {
  liveIt('rejects when beneficiary CASP is not in registry', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/send`, {
      method: 'POST',
      headers: headers(),
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

    assert.equal(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
  });

  liveIt('rejects when required fields are missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/send`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ originatorENumber: 'ENT-000001' })
    });
    const data = await res.json();

    assert.equal(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
  });

  liveIt('rejects when originator eNumber is not verified', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/send`, {
      method: 'POST',
      headers: headers(),
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

    assert.equal(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
  });
});

describe('GET /v1/arc/status/:arcTransactionId live checks', () => {
  liveIt('returns 404 for unknown transaction', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/status/arc_nonexistent_123`, { headers: headers() });
    const data = await res.json();

    assert.equal(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
  });
});

describe('POST /v1/arc/receive live checks', () => {
  liveIt('rejects when required fields are missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/receive`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ arcTransactionId: 'arc_test_123' })
    });
    const data = await res.json();

    assert.equal(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
  });
});

describe('GET /v1/arc/casps/lookup live checks', () => {
  liveIt('returns 400 when wallet query param is missing', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/lookup`, { headers: headers() });
    const data = await res.json();

    assert.equal(res.status, 400, `Expected 400, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
  });

  liveIt('returns 404 for unknown wallet', async () => {
    const res = await fetch(`${BASE_URL}/v1/arc/casps/lookup?wallet=0xUnknown999`, { headers: headers() });

    assert.equal(res.status, 404, `Expected 404, got ${res.status}`);
  });
});
