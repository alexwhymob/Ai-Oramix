import { describe, expect, it } from 'vitest';
import {
  RESULT_ACCESS_COOKIE_NAME,
  createSecret,
  hashSecret,
  isActiveAccess,
  parseResultAccess,
  secretsMatch
} from '../src/services/publicAssessmentAccess.service.js';

describe('public assessment access', () => {
  it('creates high-entropy secrets that are only validated through their hash', () => {
    const secret = createSecret();
    const hash = hashSecret(secret);

    expect(secret).toHaveLength(43);
    expect(secretsMatch(secret, hash)).toBe(true);
    expect(secretsMatch('different-secret', hash)).toBe(false);
  });

  it('rejects expired or revoked credentials', () => {
    const secret = createSecret();
    const hash = hashSecret(secret);

    expect(isActiveAccess({ hash, expiresAt: new Date(Date.now() + 1_000) }, secret)).toBe(true);
    expect(isActiveAccess({ hash, expiresAt: new Date(Date.now() - 1_000) }, secret)).toBe(false);
    expect(isActiveAccess({ hash, revokedAt: new Date() }, secret)).toBe(false);
  });

  it('parses only a well-formed result cookie', () => {
    const request = { headers: { cookie: `${RESULT_ACCESS_COOKIE_NAME}=assessment-1.session-token; theme=dark` } };
    expect(parseResultAccess(request)).toEqual({ assessmentId: 'assessment-1', token: 'session-token' });
    expect(parseResultAccess({ headers: { cookie: `${RESULT_ACCESS_COOKIE_NAME}=malformed` } })).toBeNull();
  });
});
