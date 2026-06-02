import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as authService from '../src/services/auth.service.js';

describe('function routes', () => {
  it('requires authentication for generateReport', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/functions/generateReport')
      .send({})
      .expect(401);

    expect(response.body.error).toBe('auth_required');
  });

  it('supports createDataSubAssessment function', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/functions/createDataSubAssessment')
      .send({ event: {} })
      .expect(200);

    expect(response.body).toEqual({
      skipped: true,
      reason: 'No entity_id in event'
    });
  });

  it('returns 400 for unknown quizSession actions', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/functions/quizSession')
      .send({ action: 'missing' })
      .expect(400);

    expect(response.body.error).toBe('unknown_action');
  });

  it('requires an admin or account manager for adminRegister', async () => {
    const app = createApp();

    const noAuthResponse = await request(app)
      .post('/api/functions/quizSession')
      .send({ action: 'adminRegister', form: {} })
      .expect(401);

    expect(noAuthResponse.body.error).toBe('auth_required');

    const meSpy = vi.spyOn(authService, 'getUserFromToken');
    meSpy.mockResolvedValueOnce({
      id: 'consultant-1',
      email: 'consultant@example.com',
      role: 'ai_consultant'
    });

    const forbiddenResponse = await request(app)
      .post('/api/functions/quizSession')
      .set('Authorization', 'Bearer token')
      .send({ action: 'adminRegister', form: {} })
      .expect(403);

    expect(forbiddenResponse.body.error).toBe('forbidden');
    meSpy.mockRestore();
  });
});
