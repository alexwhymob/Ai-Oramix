import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('integration routes', () => {
  it('requires authentication for llm integration', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/integrations/llm')
      .send({ prompt: 'Hello' })
      .expect(401);

    expect(response.body.error).toBe('auth_required');
  });

  it('returns 501 for integrations that are not migrated yet', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/integrations/unknown')
      .send({})
      .expect(501);

    expect(response.body.error).toBe('integration_not_migrated');
  });
});
