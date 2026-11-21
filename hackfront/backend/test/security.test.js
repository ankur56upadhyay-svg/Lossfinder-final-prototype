const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
process.env.COOKIE_SECURE = 'false';

const app = require('../app');
const userRepository = require('../repositories/userRepository');
let server;
let baseUrl;

before(async () => {
  server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

test('guest cannot read subscriptions', async () => {
  const response = await fetch(`${baseUrl}/api/subscriptions`);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('allowed browser origin can make a write request', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000' }
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});

test('write requests without a trusted origin are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'ORIGIN_FORBIDDEN');
});

test('disallowed cross-origin requests are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example' }
  });
  assert.equal(response.status, 403);
  assert.notEqual(response.headers.get('access-control-allow-origin'), 'https://untrusted.example');
});

test('disallowed origins cannot read API responses', async () => {
  const response = await fetch(`${baseUrl}/api/subscriptions`, {
    headers: { Origin: 'https://untrusted.example' }
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});

test('login keeps the JWT in an HTTP-only cookie and out of JSON', async () => {
  const originalFindByEmail = userRepository.findByEmail;
  userRepository.findByEmail = async () => ({
    userId: 'usr_test',
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('TestPassword123!', 4),
    createdAt: '2026-11-21T00:00:00.000Z'
  });

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'TestPassword123!' })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(Object.hasOwn(body, 'token'), false);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(response.headers.get('set-cookie'), /SameSite=Lax/i);
  } finally {
    userRepository.findByEmail = originalFindByEmail;
  }
});

test('backend does not serve repository source files', async () => {
  const response = await fetch(`${baseUrl}/backend/app.js`);
  assert.equal(response.status, 404);
});

test('production refuses to start without a configured JWT secret', () => {
  const childEnv = {
    ...process.env,
    NODE_ENV: 'production',
    FRONTEND_ORIGIN: 'https://example.com'
  };
  delete childEnv.JWT_SECRET;

  const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(require.resolve('../config/env'))})`], {
    cwd: os.tmpdir(),
    env: childEnv,
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET must be set/);
});

test('production refuses an insecure frontend origin', () => {
  const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(require.resolve('../config/env'))})`], {
    cwd: os.tmpdir(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      JWT_SECRET: 'test-only-secret-at-least-32-characters-long',
      FRONTEND_ORIGIN: 'http://example.com'
    },
    encoding: 'utf8'
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FRONTEND_ORIGIN must be an HTTPS origin/);
});

test('large repeated import attempts are rate limited before reaching the database', async () => {
  const token = jwt.sign({ userId: 'usr_test', email: 'test@example.com' }, process.env.JWT_SECRET);
  const headers = {
    Origin: 'http://localhost:3000',
    Cookie: `af_token=${token}`,
    'Content-Type': 'application/json'
  };

  for (let i = 0; i < 10; i++) {
    const response = await fetch(`${baseUrl}/api/imports`, {
      method: 'POST', headers, body: '{}'
    });
    assert.equal(response.status, 400);
  }

  const response = await fetch(`${baseUrl}/api/imports`, {
    method: 'POST', headers, body: '{}'
  });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'TOO_MANY_REQUESTS');
});

test('production enforces secure cookies and normalizes the frontend origin', () => {
  const result = spawnSync(process.execPath, ['-e',
    `const env=require(${JSON.stringify(require.resolve('../config/env'))}); console.log(JSON.stringify({secure:env.COOKIE_SECURE,origin:env.FRONTEND_ORIGIN}))`
  ], {
    cwd: os.tmpdir(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      JWT_SECRET: 'test-only-secret-at-least-32-characters-long',
      COOKIE_SECURE: 'false',
      FRONTEND_ORIGIN: 'https://example.com/'
    },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    secure: true,
    origin: 'https://example.com'
  });
});
