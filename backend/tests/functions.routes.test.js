import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('function routes', () => {
  it('returns 501 for functions that are not migrated yet', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/functions/generateReport')
      .send({})
      .expect(501);

    expect(response.body.error).toBe('function_not_migrated');
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
