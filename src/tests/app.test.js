import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

before(() => {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
  process.env.SUPABASE_SERVICE_KEY ||= 'test-service-key';
  process.env.API_KEY_SECRET ||= 'test-api-key-secret';
  process.env.ADMIN_API_KEYS ||= 'admin_test_key';
  process.env.ADMIN_TOKEN ||= 'admin_test_token';
});

async function withServer(app, run) {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe('app bootstrap', () => {
  it('serves health without requiring partner API auth', async () => {
    const { default: app } = await import('../index.js');

    await withServer(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json();

      assert.equal(res.status, 200);
      assert.equal(data.status, 'ok');
      assert.equal(data.service, 'Sove Identity API');
    });
  });

  it('protects admin debug routes with admin API keys', async () => {
    const { default: app } = await import('../index.js');

    await withServer(app, async (baseUrl) => {
      const denied = await fetch(`${baseUrl}/admin/debug/stack`);
      assert.equal(denied.status, 403);

      const allowed = await fetch(`${baseUrl}/admin/debug/stack`, {
        headers: { 'x-api-key': 'admin_test_key' }
      });
      const data = await allowed.json();

      assert.equal(allowed.status, 200);
      assert.equal(data.credential_layer, 'Solana Attestation Service');
    });
  });
});
