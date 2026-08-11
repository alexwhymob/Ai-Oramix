import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('auth routes', () => {
  it('requires a token for the current-user endpoint', async () => {
    const response = await request(createApp())
      .get('/api/auth/me')
      .expect(401);

    expect(response.body.error).toBe('auth_required');
  });

  it('clears auth cookies when logout is requested without a session', async () => {
    const response = await request(createApp())
      .post('/api/auth/logout')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.headers['set-cookie']).toHaveLength(2);
    expect(response.headers['set-cookie'].every((cookie) => !cookie.includes('; Secure'))).toBe(true);
  });
});
