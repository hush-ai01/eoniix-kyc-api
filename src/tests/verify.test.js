import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_BASE_URL;
const API_KEY = process.env.TEST_API_KEY;
const liveIt = BASE_URL && API_KEY ? it : it.skip;

function headers(apiKey = API_KEY) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  };
}

describe('POST /v1/verify live checks', () => {
  liveIt('returns verified or already_verified for a valid eNumber', async () => {
    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        eNumber: 'ENT-000001',
        country: 'NG',
        idType: 'BVN',
        idNumber: '22222222222',
        selfieBase64: 'dGVzdA=='
      })
    });
    const data = await res.json();

    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    assert.ok(['verified', 'already_verified'].includes(data.status), `Unexpected status: ${data.status}`);
    assert.equal(data.eNumber, 'ENT-000001');
    assert.ok(data.credentialId, 'Missing credentialId');
  });

  liveIt('rejects invalid API keys', async () => {
    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: 'POST',
      headers: headers('invalid-key'),
      body: JSON.stringify({
        eNumber: 'ENT-000001',
        country: 'NG',
        idType: 'BVN',
        idNumber: '22222222222',
        selfieBase64: 'dGVzdA=='
      })
    });
    const data = await res.json();

    assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
    assert.ok(data.status || data.error, 'Missing status or error');
  });

  liveIt('fails closed when an eNumber has no DID link', async () => {
    const res = await fetch(`${BASE_URL}/v1/verify`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        eNumber: 'ENT-999999',
        country: 'NG',
        idType: 'BVN',
        idNumber: '22222222222',
        selfieBase64: 'dGVzdA=='
      })
    });
    const data = await res.json();

    assert.equal(res.status, 404, `Expected 404, got ${res.status}`);
    assert.equal(data.reason, 'enumber_did_not_found');
  });
});
