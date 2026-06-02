import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  signAuthToken,
  verifyAuthToken,
  verifyPassword
} from '../src/services/auth.service.js';

describe('auth service', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('secret-password');

    expect(hash).not.toBe('secret-password');
    await expect(verifyPassword('secret-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('signs and verifies auth tokens', () => {
    const token = signAuthToken({
      id: 'user-1',
      email: 'admin@example.com',
      role: 'admin'
    });

    const payload = verifyAuthToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('admin@example.com');
    expect(payload.role).toBe('admin');
  });
});
