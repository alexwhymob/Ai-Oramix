import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as authService from '../src/services/auth.service.js';

describe('user routes', () => {
  it('requires admin access to invite users', async () => {
    const app = createApp();

    await request(app)
      .post('/api/users/invite')
      .send({ email: 'invitee@example.com', role: 'ai_consultant' })
      .expect(401);

    const meSpy = vi.spyOn(authService, 'getUserFromToken');

    meSpy.mockResolvedValueOnce({
      id: 'user-1',
      email: 'manager@example.com',
      role: 'account_manager'
    });

    const forbiddenResponse = await request(app)
      .post('/api/users/invite')
      .set('Authorization', 'Bearer token')
      .send({ email: 'invitee@example.com', role: 'ai_consultant' })
      .expect(403);

    expect(forbiddenResponse.body.error).toBe('forbidden');

    meSpy.mockRestore();
  });
});
