import { describe, expect, it } from 'vitest';
import { handleQuizSessionAction, isCorporateEmail } from '../src/services/quizSession.service.js';

describe('quizSession service', () => {
  it('validates corporate emails', () => {
    expect(isCorporateEmail('person@gmail.com')).toBe(false);
    expect(isCorporateEmail('person@company.com')).toBe(true);
    expect(isCorporateEmail('invalid')).toBe(false);
  });

  it('rejects unknown actions', async () => {
    await expect(handleQuizSessionAction({ action: 'missing' })).rejects.toMatchObject({
      code: 'unknown_action',
      status: 400
    });
  });

  it('rejects personal email on customer registration before touching database', async () => {
    await expect(handleQuizSessionAction({
      action: 'registerCustomer',
      form: {
        name: 'Test User',
        email: 'test@gmail.com',
        company: 'ACME',
        role: 'CEO'
      }
    })).rejects.toMatchObject({
      code: 'non_corporate_email',
      status: 422
    });
  });

  it('requires data consent on customer self-registration before touching database', async () => {
    await expect(handleQuizSessionAction({
      action: 'registerCustomer',
      form: {
        name: 'Test User',
        email: 'test@company.com',
        company: 'ACME',
        role: 'CEO'
      }
    })).rejects.toMatchObject({
      code: 'data_consent_required',
      status: 422
    });
  });
});
