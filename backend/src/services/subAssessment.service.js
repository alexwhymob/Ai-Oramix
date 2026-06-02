import { Assessment } from '../models/index.js';

const DATA_PILLAR_CODE = 'dados';
const DATA_SCORE_THRESHOLD = 2.5;

export async function createDataSubAssessment({ event, data } = {}) {
  const assessmentId = event?.entity_id;
  if (!assessmentId) {
    return { skipped: true, reason: 'No entity_id in event' };
  }

  const assessment = data || await Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment) {
    const error = new Error('not_found');
    error.status = 404;
    error.code = 'not_found';
    throw error;
  }

  if (assessment.status !== 'completed') {
    return { skipped: true, reason: 'Not completed' };
  }

  if (assessment.assessment_type === 'sub_assessment') {
    return { skipped: true, reason: 'Already a sub-assessment' };
  }

  const pillarScores = parsePillarScores(assessment.pillar_scores);
  const dataScore = pillarScores.find(pillar => pillar.code === DATA_PILLAR_CODE)?.score;

  if (dataScore === undefined || dataScore >= DATA_SCORE_THRESHOLD) {
    return {
      skipped: true,
      reason: `Data score ${dataScore} >= ${DATA_SCORE_THRESHOLD}, no sub-assessment needed`
    };
  }

  const existing = await Assessment.findOne({ parent_assessment_id: assessmentId }).lean();
  if (existing) {
    return {
      skipped: true,
      reason: 'Sub-assessment already exists',
      subAssessmentId: existing.id
    };
  }

  const subAssessment = await Assessment.create({
    customer_id: assessment.customer_id,
    assessment_type: 'sub_assessment',
    parent_assessment_id: assessmentId,
    sub_assessment_for_pillar: DATA_PILLAR_CODE,
    status: 'not_started',
    language: assessment.language || 'pt'
  });

  return {
    success: true,
    subAssessmentId: subAssessment.id,
    dataScore
  };
}

export function parsePillarScores(rawPillarScores) {
  if (Array.isArray(rawPillarScores)) return rawPillarScores;

  try {
    return JSON.parse(rawPillarScores || '[]');
  } catch {
    return [];
  }
}
