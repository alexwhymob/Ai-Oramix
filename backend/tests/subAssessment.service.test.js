import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pillarFindMock, assessmentFindMock } = vi.hoisted(() => ({
  pillarFindMock: vi.fn(),
  assessmentFindMock: vi.fn()
}));

vi.mock('../src/models/index.js', () => ({
  Assessment: {
    find: assessmentFindMock,
    create: vi.fn()
  },
  Pillar: {
    find: pillarFindMock
  }
}));

import { createDataSubAssessment, parsePillarScores } from '../src/services/subAssessment.service.js';

describe('subAssessment service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pillarFindMock.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      })
    });
    assessmentFindMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue([])
    });
  });

  it('parses pillar scores safely', () => {
    expect(parsePillarScores('[{"code":"dados","score":2}]')).toEqual([{ code: 'dados', score: 2 }]);
    expect(parsePillarScores('not-json')).toEqual([]);
    expect(parsePillarScores(null)).toEqual([]);
  });

  it('skips when event entity id is missing', async () => {
    await expect(createDataSubAssessment({ event: {} })).resolves.toEqual({
      skipped: true,
      reason: 'No entity_id in event'
    });
  });

  it('skips completed main assessment when no pillar is below threshold', async () => {
    pillarFindMock.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            code: 'dados',
            min_score: 2.5,
            sub_assessment_template_id: 'template-sub-dados'
          }
        ])
      })
    });

    const result = await createDataSubAssessment({
      event: { entity_id: 'assessment-1' },
      data: {
        id: 'assessment-1',
        customer_id: 'customer-1',
        status: 'completed',
        assessment_type: 'main',
        pillar_scores: JSON.stringify([{ code: 'dados', score: 3 }])
      }
    });

    expect(result).toEqual({
      skipped: true,
      reason: 'No sub-assessment needed',
      skippedItems: [
        {
          pillar: 'dados',
          score: 3,
          reason: 'Score above threshold or not found'
        }
      ]
    });
  });

  it('skips sub assessments', async () => {
    const result = await createDataSubAssessment({
      event: { entity_id: 'assessment-1' },
      data: {
        id: 'assessment-1',
        customer_id: 'customer-1',
        status: 'completed',
        assessment_type: 'sub_assessment',
        pillar_scores: JSON.stringify([{ code: 'dados', score: 1 }])
      }
    });

    expect(result).toEqual({
      skipped: true,
      reason: 'Already a sub-assessment'
    });
  });
});
