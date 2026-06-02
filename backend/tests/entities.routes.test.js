import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('entity routes', () => {
  it('returns 404 for unknown entities', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/entities/UnknownEntity')
      .expect(404);

    expect(response.body).toEqual({
      error: 'entity_not_found',
      message: 'Entity UnknownEntity not found'
    });
  });

  it('returns 400 for invalid q parameter before hitting MongoDB', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/entities/Customer?q={bad-json')
      .expect(400);

    expect(response.body.error).toBe('invalid_query');
  });
});
