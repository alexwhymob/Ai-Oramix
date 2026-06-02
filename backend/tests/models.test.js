import { describe, expect, it } from 'vitest';
import {
  Assessment,
  AssessmentAnswer,
  ConsultantNote,
  Customer,
  Pillar,
  Question,
  Report,
  User
} from '../src/models/index.js';

describe('Mongoose models', () => {
  it('applies Base44-compatible defaults to Customer', () => {
    const customer = new Customer({
      name: 'Ana Silva',
      email: 'ANA@EXAMPLE.COM',
      company: 'Oramix'
    });

    expect(customer.id).toBeTruthy();
    expect(customer.email).toBe('ana@example.com');
    expect(customer.language).toBe('pt');
    expect(customer.registered_by).toBe('self');
    expect(customer.created_date).toBeInstanceOf(Date);
  });

  it('applies defaults to main assessments', () => {
    const assessment = new Assessment({
      customer_id: 'customer-1'
    });

    expect(assessment.status).toBe('not_started');
    expect(assessment.language).toBe('pt');
    expect(assessment.assessment_type).toBe('main');
    expect(assessment.reviewed_by_consultant).toBe(false);
  });

  it('validates answer values from 1 to 5', async () => {
    const answer = new AssessmentAnswer({
      assessment_id: 'assessment-1',
      question_id: 'question-1',
      value: 6
    });

    await expect(answer.validate()).rejects.toThrow(/Path `value` \(6\) is more than maximum allowed value/);
  });

  it('defines expected indexes for frequent lookups', () => {
    expect(Customer.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ id: 1 }, expect.objectContaining({ unique: true })],
        [{ email: 1 }, expect.any(Object)],
        [{ qr_token: 1 }, expect.any(Object)]
      ])
    );

    expect(Assessment.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ customer_id: 1 }, expect.any(Object)],
        [{ parent_assessment_id: 1 }, expect.any(Object)]
      ])
    );

    expect(Question.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ code: 1, pillar_code: 1 }, expect.objectContaining({ unique: true })]
      ])
    );
  });

  it('exposes all migrated entity models', () => {
    expect([
      Customer,
      Assessment,
      AssessmentAnswer,
      Pillar,
      Question,
      Report,
      ConsultantNote,
      User
    ].map(model => model.modelName)).toEqual([
      'Customer',
      'Assessment',
      'AssessmentAnswer',
      'Pillar',
      'Question',
      'Report',
      'ConsultantNote',
      'User'
    ]);
  });
});
