import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../src/app.js';
import { createRateLimiter } from '../src/middlewares/security.middleware.js';

describe('security middleware', () => {
  it('sets baseline security headers and hides Express fingerprinting', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(response.headers['content-security-policy']).toContain("object-src 'none'");
  });

  it('rejects state-changing requests from an unexpected origin', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(403);

    expect(response.body.error).toBe('csrf_origin_rejected');
  });

  it('rejects cookie-based state changes without a trusted origin or referer', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .set('Cookie', 'oramix_access_token=example')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(403);

    expect(response.body.error).toBe('csrf_origin_rejected');
  });

  it('limits repeated requests from the same client', async () => {
    const app = express();
    app.use(createRateLimiter({ max: 2, windowMs: 60_000 }));
    app.post('/limited', (_req, res) => res.sendStatus(204));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await request(app)
        .post('/limited')
        .expect(204);
    }

    const response = await request(app)
      .post('/limited')
      .expect(429);

    expect(response.body.error).toBe('rate_limited');
    expect(response.headers['ratelimit-limit']).toBeDefined();
  });
});
