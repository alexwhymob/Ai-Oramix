import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('returns backend health status', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'oramix-ai-backend'
    });
  });
});
