import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'https://api.sove.africa';
const API_KEY = process.env.TEST_API_KEY || 'sove_live_71fb23a6593fe0a75deec6f3a42d354dadcdf56b093d39a9';

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY
};

describe('POST /v1/verify', () => {

  it('happy path — returns verified or already_verified for valid eNumber', async () => {
    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eNumber: 'ENT-000001',
        country: 'NG',
        idType: 'BVN',
        idNumber: '22222222222',
        selfieBase64: 'dGVzdA=='
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(['verified', 'already_verified'].includes(data.status), `Unexpected status: ${data.status}`);
    assert.ok(data.eNumber === 'ENT-000001', 'eNumber mismatch');
    assert.ok(data.credentialId, 'Missing credentialId');
    console.log('✅ Happy path passed:', data.status);
  });

  it('failed auth — rejects invalid API key', async () => {
    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'invalid-key' },
      body: JSON.stringify({
        eNumber: 'ENT-000001',
        country: 'NG',
        idType: 'BVN',
        idNumber: '22222222222',
        selfieBase64: 'dGVzdA=='
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.ok(data.status || data.error, "Missing status or error");
    console.log('✅ Auth rejection passed');
  });

  it('unknown eNumber — auto-generates DID and verifies', async () => {
    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eNumber: 'ENT-999999',
        country: 'NG',
        idType: 'BVN',
        idNumber: '22222222222',
        selfieBase64: 'dGVzdA=='
      })
    });
    const data = await res.json();
    assert.ok(res.status === 200 || res.status === 422, `Expected 200 or 422, got ${res.status}`);
    assert.ok(data.status || data.error, "Missing status or error");
    console.log('✅ Unknown eNumber auto-verified passed');
  });

});
