import { afterEach, describe, expect, it } from 'vitest';
import {
  assertLoginAllowed,
  clearLoginFailures,
  recordLoginFailure
} from '../src/services/loginProtection.service.js';

describe('login protection', () => {
  const email = `bruteforce-${Date.now()}@example.com`;

  afterEach(() => {
    clearLoginFailures(email);
  });

  it('locks an account progressively after repeated failures', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = recordLoginFailure(email);
      expect(result.suspected).toBe(attempt === 4);
    }

    expect(() => assertLoginAllowed(email)).toThrowError(
      expect.objectContaining({
        code: 'auth_temporarily_locked',
        status: 429,
        securityEvent: true
      })
    );
  });
});
