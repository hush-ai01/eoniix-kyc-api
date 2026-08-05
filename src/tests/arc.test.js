import { test, describe } from 'node:test';
import assert from 'node:assert';

const BASE = 'https://api.sove.africa';
const KEY = 'sove_a2c2f5a9f0fee40ba4438d45dbfbead981e588b733aa292e09832895460e32a9';
const BAD_KEY = 'bad_key_123';
const h = { 'Content-Type': 'application/json', 'x-api-key': KEY };

describe('Health', () => {
  test('GET /health returns 200', async () => {
    const res = await fetch(`${BASE}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
  });
});

describe('Authentication', () => {
  test('Bad API key returns 401', async () => {
    const res = await fetch(`${BASE}/v1/arc/status/fake_id`, {
      headers: { 'x-api-key': BAD_KEY }
    });
    assert.strictEqual(res.status, 401);
  });

  test('Missing API key returns 401', async () => {
    const res = await fetch(`${BASE}/v1/arc/status/fake_id`);
    assert.strictEqual(res.status, 401);
  });
});

describe('CASP Registration Validation', () => {
  test('Missing required fields returns 400', async () => {
    const res = await fetch(`${BASE}/v1/arc/casps/register`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ caspId: 'test' })
    });
    assert.ok([400, 429].includes(res.status), `Expected 400 or 429, got ${res.status}`);
    const body = await res.json();
    assert.strictEqual(body.error, 'Validation failed');
    assert.ok(body.details.length > 0);
  });

  test('Short publicKey returns validation error', async () => {
    const res = await fetch(`${BASE}/v1/arc/casps/register`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        caspId: 'test_casp',
        caspName: 'Test',
        endpointUrl: 'https://test.co.za/arc',
        publicKey: 'short',
        country: 'ZA',
        fscaLicensed: true,
        walletAddresses: ['0x1234567890abcdef12345678']
      })
    });
    assert.ok([400, 429].includes(res.status), `Expected 400 or 429, got ${res.status}`);
    const body = await res.json();
    assert.ok(body.details.some(d => d.field === 'publicKey'));
  });
});

describe('ARC Send', () => {
  test('Send below threshold returns reduced payload', async () => {
    const res = await fetch(`${BASE}/v1/arc/send`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        originatorENumber: 'ENT-000001',
        originatorWallet: '0xTestWallet123',
        beneficiaryWallet: '0xTestWallet456',
        beneficiaryCaspId: 'test_casp_002',
        amountZar: 1000,
        chainTransactionRef: 'tx_test_suite_001'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.threshold, 'reduced');
    assert.ok(body.arcTransactionId);
  });

  test('Send above threshold returns full payload', async () => {
    const res = await fetch(`${BASE}/v1/arc/send`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        originatorENumber: 'ENT-000001',
        originatorWallet: '0xTestWallet123',
        beneficiaryWallet: '0xTestWallet456',
        beneficiaryCaspId: 'test_casp_002',
        amountZar: 10000,
        chainTransactionRef: 'tx_test_suite_002'
      })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.threshold, 'full');
    assert.ok(body.arcTransactionId);
  });
});

describe('ARC Status', () => {
  test('Unknown transaction ID returns 404', async () => {
    const res = await fetch(`${BASE}/v1/arc/status/arc_nonexistent_id`, {
      headers: h
    });
    assert.strictEqual(res.status, 404);
  });
});

describe('Swagger Docs', () => {
  test('Docs are restricted in production', async () => {
    const res = await fetch(`${BASE}/docs`);
    assert.ok([401, 403].includes(res.status), `Expected 401 or 403, got ${res.status}`);
  });
});
