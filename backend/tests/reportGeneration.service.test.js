import { describe, expect, it, vi } from 'vitest';
import {
  buildDetailedAnswers,
  buildReportContext,
  buildSectionSchema,
  createGenerateReport,
  getMaturityLabel
} from '../src/services/reportGeneration.service.js';

describe('report generation service', () => {
  it('builds a strict section schema for selected sections', () => {
    expect(buildSectionSchema(['section_1', 'section_5'])).toEqual({
      type: 'object',
      properties: {
        section_1: expect.objectContaining({ type: 'string' }),
        section_5: expect.objectContaining({ type: 'string' })
      },
      required: ['section_1', 'section_5'],
      additionalProperties: false
    });
  });

  it('builds detailed answers from pillars, questions, and answers', () => {
    const detailedAnswers = buildDetailedAnswers({
      language: 'pt',
      pillars: [{ code: 'dados', name_pt: 'Dados', weight: 20 }],
      pillarScores: [{ code: 'dados', score: 2.4 }],
      questions: [{
        id: 'question-1',
        code: 'Q1',
        pillar_code: 'dados',
        text_pt: 'Existe governanca?',
        anchor_2_pt: 'Parcialmente'
      }],
      answers: [{ question_id: 'question-1', value: 2 }]
    });

    expect(detailedAnswers).toContain('Dados');
    expect(detailedAnswers).toContain('Existe governanca?');
    expect(detailedAnswers).toContain('Parcialmente');
  });

  it('builds a report context with maturity label and company information', () => {
    const context = buildReportContext({
      language: 'pt',
      assessment: {
        completed_at: '2026-05-01T10:00:00.000Z',
        created_date: '2026-05-01T10:00:00.000Z',
        global_score: 3.2,
        pillar_scores: JSON.stringify([{ code: 'dados', name_pt: 'Dados', score: 3.2, weight: 20 }])
      },
      customer: {
        company: 'Oramix Labs',
        sector: 'Tech',
        company_size: '11-50',
        name: 'Alex',
        role: 'CEO'
      },
      pillars: [{ code: 'dados', name_pt: 'Dados', weight: 20 }],
      questions: [],
      answers: []
    });

    expect(context).toContain('ORGANISATION: Oramix Labs');
    expect(context).toContain('MATURITY: Em Desenvolvimento');
    expect(context).toContain('PILLAR SCORES: Dados: 3.20/5 (20%)');
  });

  it('maps maturity labels consistently by language', () => {
    expect(getMaturityLabel(1.8, 'pt')).toBe('Nao Preparado');
    expect(getMaturityLabel(4.5, 'en')).toBe('Advanced');
  });

  it('allows admins to generate a report through injected dependencies', async () => {
    const saveMock = vi.fn().mockResolvedValue({ id: 'report-1' });
    const reportDocument = { id: 'report-1', save: saveMock };
    const generateReport = createGenerateReport({
      Assessment: {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            id: 'assessment-1',
            customer_id: 'customer-1',
            status: 'completed',
            assessment_type: 'main',
            global_score: 3.4,
            completed_at: '2026-05-01T10:00:00.000Z',
            created_date: '2026-05-01T10:00:00.000Z',
            pillar_scores: JSON.stringify([{ code: 'dados', name_pt: 'Dados', score: 3.4, weight: 25 }])
          })
        })
      },
      Customer: {
        findOne: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            company: 'Oramix',
            sector: 'Tech',
            company_size: '11-50',
            name: 'Alex',
            role: 'CEO'
          })
        })
      },
      Pillar: {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{ code: 'dados', name_pt: 'Dados', weight: 25, assessment_type: 'main' }])
          })
        })
      },
      Question: {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([{
              id: 'question-1',
              code: 'Q1',
              pillar_code: 'dados',
              text_pt: 'Questao',
              anchor_4_pt: 'Bom',
              order: 1
            }])
          })
        })
      },
      AssessmentAnswer: {
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ question_id: 'question-1', value: 4 }])
        })
      },
      Report: {
        findOne: vi.fn().mockResolvedValue(reportDocument),
        create: vi.fn()
      },
      ReportTemplate: {
        findOne: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(null)
          })
        })
      },
      ReportSection: {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([])
          })
        })
      },
      llm: {
        generateStructuredObject: vi.fn().mockResolvedValue({ section_1: '## Summary' })
      },
      now: () => new Date('2026-06-02T10:00:00.000Z')
    });

    const result = await generateReport(
      { assessmentId: 'assessment-1', sections: ['section_1'] },
      { actor: { id: 'user-1', role: 'admin' } }
    );

    expect(result).toEqual({
      success: true,
      reportId: 'report-1',
      sectionsGenerated: ['section_1']
    });
    expect(saveMock).toHaveBeenCalledTimes(2);
  });
});
