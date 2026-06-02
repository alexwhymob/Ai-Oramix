import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('audit log routes', () => {
  it('requires authentication to list audit logs', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/audit-logs')
      .expect(401);

    expect(response.body.error).toBe('auth_required');
  });
});
