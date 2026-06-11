import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'https://eoniix-kyc-api.onrender.com';
const API_KEY = 'eoniix-test-key-123';

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
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Auth rejection passed');
  });

  it('unknown eNumber — returns 404', async () => {
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
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    assert.ok(data.error, 'Missing error message');
    console.log('✅ Unknown eNumber passed');
  });

});
