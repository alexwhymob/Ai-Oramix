import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

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
});
