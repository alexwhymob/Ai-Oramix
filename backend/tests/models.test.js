import { describe, expect, it } from 'vitest';
import {
  Assessment,
  AssessmentAnswer,
  AuditLog,
  ConsultantNote,
  Customer,
  HtmlReportConfig,
  MaturityLevel,
  MaturityPreset,
  Pillar,
  NotificationTemplate,
  Question,
  Report,
  ReportSection,
  ReportTemplate,
  User
} from '../src/models/index.js';
import { getEntityModel } from '../src/entities/entityRegistry.js';

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
    expect(customer.data_consent).toBe(false);
    expect(customer.data_consent_at).toBeNull();
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
        [{ account_manager_id: 1 }, expect.any(Object)]
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
      ReportTemplate,
      ReportSection,
      NotificationTemplate,
      MaturityPreset,
      MaturityLevel,
      HtmlReportConfig,
      ConsultantNote,
      User,
      AuditLog
    ].map(model => model.modelName)).toEqual([
      'Customer',
      'Assessment',
      'AssessmentAnswer',
      'Pillar',
      'Question',
      'Report',
      'ReportTemplate',
      'ReportSection',
      'NotificationTemplate',
      'MaturityPreset',
      'MaturityLevel',
      'HtmlReportConfig',
      'ConsultantNote',
      'User',
      'AuditLog'
    ]);
  });

  it('registers models for generic entity endpoints', () => {
    expect(getEntityModel('Customer')).toBe(Customer);
    expect(getEntityModel('Assessment')).toBe(Assessment);
    expect(getEntityModel('Unknown')).toBeNull();
  });

  it('defines audit log fields for admin activity tracking', () => {
    const log = new AuditLog({
      action: 'entity.update',
      entity: 'Customer',
      entity_id: 'customer-1',
      metadata: { changed: ['name'] }
    });

    expect(log.id).toBeTruthy();
    expect(log.action).toBe('entity.update');
    expect(log.metadata).toEqual({ changed: ['name'] });
    expect(log.created_date).toBeInstanceOf(Date);
  });
});
