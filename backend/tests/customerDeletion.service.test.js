import { describe, expect, it } from 'vitest';
import { validateDeletionRequest } from '../src/services/customerDeletion.service.js';

describe('customer deletion validation', () => {
  it('requires an id, confirmation and a meaningful reason before accessing the database', () => {
    expect(() => validateDeletionRequest({})).toThrow(/customerId/);
    expect(() => validateDeletionRequest({ customerId: 'customer-1', reason: 'Duplicate record' })).toThrow(/company name/);
    expect(() => validateDeletionRequest({ customerId: 'customer-1', confirmation: 'ACME', reason: 'short' })).toThrow(/reason/);
  });

  it('accepts a confirmed request with a bounded reason', () => {
    expect(() => validateDeletionRequest({
      customerId: 'customer-1',
      confirmation: 'ACME',
      reason: 'Duplicate customer created during testing'
    })).not.toThrow();
  });
});
