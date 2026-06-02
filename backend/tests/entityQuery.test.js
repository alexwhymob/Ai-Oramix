import { describe, expect, it } from 'vitest';
import { parseEntityQuery } from '../src/entities/entityQuery.js';

describe('parseEntityQuery', () => {
  it('parses Base44-compatible filters, pagination and sorting', () => {
    const parsed = parseEntityQuery({
      q: '{"status":"completed"}',
      limit: '25',
      skip: '10',
      sort_by: '-completed_at'
    });

    expect(parsed).toEqual({
      filter: { status: 'completed' },
      limit: 25,
      skip: 10,
      sort: { completed_at: -1 }
    });
  });

  it('caps limit to the configured maximum', () => {
    const parsed = parseEntityQuery({ limit: '9999' });

    expect(parsed.limit).toBe(500);
  });

  it('rejects invalid JSON filters', () => {
    expect(() => parseEntityQuery({ q: '{bad-json' })).toThrow('Invalid q parameter');
  });

  it('strips unsafe mongo operator filters', () => {
    const parsed = parseEntityQuery({
      q: '{"status":"completed","$where":"danger","profile.name":"bad"}'
    });

    expect(parsed.filter).toEqual({ status: 'completed' });
  });
});
