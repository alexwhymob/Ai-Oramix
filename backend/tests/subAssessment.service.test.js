import { describe, expect, it } from 'vitest';
import { createDataSubAssessment, parsePillarScores } from '../src/services/subAssessment.service.js';

describe('subAssessment service', () => {
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

  it('skips completed main assessment when data score does not require sub assessment', async () => {
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
      reason: 'Data score 3 >= 2.5, no sub-assessment needed'
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
