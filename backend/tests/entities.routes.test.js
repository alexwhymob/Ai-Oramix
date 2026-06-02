import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as authService from '../src/services/auth.service.js';

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
      .get('/api/entities/Pillar?q={bad-json')
      .expect(400);

    expect(response.body.error).toBe('invalid_query');
  });

  it('requires admin access for User entities', async () => {
    const app = createApp();

    const meSpy = vi.spyOn(authService, 'getUserFromToken');

    const noAuthResponse = await request(app)
      .get('/api/entities/User')
      .expect(401);

    expect(noAuthResponse.body.error).toBe('auth_required');

    meSpy.mockResolvedValueOnce({
      id: 'user-1',
      email: 'manager@example.com',
      role: 'account_manager'
    });

    const forbiddenResponse = await request(app)
      .get('/api/entities/User')
      .set('Authorization', 'Bearer token')
      .expect(403);

    expect(forbiddenResponse.body.error).toBe('forbidden');

    meSpy.mockRestore();
  });

  it('requires authentication for customer data', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/entities/Customer')
      .expect(401);

    expect(response.body.error).toBe('auth_required');
  });

  it('prevents consultants from creating customers', async () => {
    const app = createApp();
    const meSpy = vi.spyOn(authService, 'getUserFromToken');

    meSpy.mockResolvedValueOnce({
      id: 'consultant-1',
      email: 'consultant@example.com',
      role: 'ai_consultant'
    });

    const response = await request(app)
      .post('/api/entities/Customer')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Ana', email: 'ana@company.com', company: 'ACME', role: 'CEO' })
      .expect(403);

    expect(response.body.error).toBe('forbidden');

    meSpy.mockRestore();
  });

  it('prevents account managers from deleting customers through generic entities', async () => {
    const app = createApp();
    const meSpy = vi.spyOn(authService, 'getUserFromToken');

    meSpy.mockResolvedValueOnce({
      id: 'manager-1',
      email: 'manager@example.com',
      role: 'account_manager'
    });

    const response = await request(app)
      .delete('/api/entities/Customer/customer-1')
      .set('Authorization', 'Bearer token')
      .expect(403);

    expect(response.body.error).toBe('forbidden');

    meSpy.mockRestore();
  });
});
