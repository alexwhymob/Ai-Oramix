import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/scripts/importCsv/parseCsv.js';
import { mapAssessmentAnswerRecord } from '../src/scripts/importCsv/importAssessmentAnswers.js';
import { mapPillarRecord } from '../src/scripts/importCsv/importPillars.js';
import { mapQuestionRecord } from '../src/scripts/importCsv/importQuestions.js';

describe('CSV import utilities', () => {
  it('parses quoted values with commas and escaped quotes', () => {
    const records = parseCsv('id,name,description\r\n"1","ACME, Inc.","Uses ""quoted"" values"\r\n');

    expect(records).toEqual([
      {
        id: '1',
        name: 'ACME, Inc.',
        description: 'Uses "quoted" values'
      }
    ]);
  });

  it('maps Pillar CSV records to mongoose payloads', () => {
    const mapped = mapPillarRecord({
      id: 'pillar-1',
      code: 'dados',
      name_pt: 'Dados',
      name_en: 'Data',
      weight: '15',
      order: '2',
      assessment_type: 'main',
      created_date: '2026-05-30T14:30:37.573000',
      updated_date: '2026-05-30T19:45:18.821000',
      created_by_id: 'user-1',
      created_by: 'ignored@example.com',
      is_sample: 'false'
    });

    expect(mapped).toMatchObject({
      id: 'pillar-1',
      code: 'dados',
      name_pt: 'Dados',
      name_en: 'Data',
      weight: 15,
      order: 2,
      assessment_type: 'main',
      created_by_id: 'user-1'
    });
    expect(mapped.created_date).toBeInstanceOf(Date);
    expect(mapped).not.toHaveProperty('created_by');
    expect(mapped).not.toHaveProperty('is_sample');
  });

  it('maps Question CSV records to mongoose payloads', () => {
    const mapped = mapQuestionRecord({
      id: 'question-1',
      pillar_code: 'dados',
      code: 'D01',
      text_pt: 'Pergunta?',
      text_en: '',
      anchor_1_pt: 'Nao',
      anchor_2_pt: 'Parcial',
      order: '10'
    });

    expect(mapped).toMatchObject({
      id: 'question-1',
      pillar_code: 'dados',
      code: 'D01',
      text_pt: 'Pergunta?',
      text_en: null,
      anchor_1_pt: 'Nao',
      anchor_2_pt: 'Parcial',
      order: 10
    });
  });

  it('maps AssessmentAnswer CSV records to mongoose payloads', () => {
    const mapped = mapAssessmentAnswerRecord({
      id: 'answer-1',
      assessment_id: 'assessment-1',
      question_id: 'question-1',
      question_code: 'D01',
      pillar_code: 'dados',
      value: '4'
    });

    expect(mapped).toMatchObject({
      id: 'answer-1',
      assessment_id: 'assessment-1',
      question_id: 'question-1',
      question_code: 'D01',
      pillar_code: 'dados',
      value: 4
    });
  });
});
