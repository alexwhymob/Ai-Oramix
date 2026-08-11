import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

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
  });

  it('rejects state-changing requests from an unexpected origin', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(403);

    expect(response.body.error).toBe('csrf_origin_rejected');
  });
});
