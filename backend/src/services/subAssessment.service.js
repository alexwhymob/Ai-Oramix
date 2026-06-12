import { Assessment, Pillar } from '../models/index.js';

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
  if (!pillarScores.length) {
    return { skipped: true, reason: 'No pillar scores found' };
  }

  const pillarFilter = {
    assessment_type: { $ne: 'sub_assessment' },
    min_score: { $ne: null },
    sub_assessment_template_id: { $ne: null }
  };

  if (assessment.assessment_template_id) {
    pillarFilter.assessment_template_id = assessment.assessment_template_id;
  } else {
    pillarFilter.$or = [
      { assessment_template_id: null },
      { assessment_template_id: { $exists: false } }
    ];
  }

  const [configuredPillars, existingSubs] = await Promise.all([
    Pillar.find(pillarFilter).sort({ order: 1, created_date: 1 }).lean(),
    Assessment.find({ parent_assessment_id: assessmentId }).lean()
  ]);

  if (!configuredPillars.length) {
    return { skipped: true, reason: 'No pillars with min_score configured' };
  }

  const created = [];
  const skipped = [];

  for (const pillar of configuredPillars) {
    const scoreEntry = pillarScores.find(item => item.code === pillar.code);
    const score = scoreEntry?.score;

    if (score === undefined || score >= pillar.min_score) {
      skipped.push({
        pillar: pillar.code,
        score,
        reason: 'Score above threshold or not found'
      });
      continue;
    }

    const alreadyExists = existingSubs.some((sub) => sub.sub_assessment_for_pillar === pillar.code);
    if (alreadyExists) {
      skipped.push({ pillar: pillar.code, reason: 'Already exists' });
      continue;
    }

    const subAssessment = await Assessment.create({
      customer_id: assessment.customer_id,
      assessment_type: 'sub_assessment',
      assessment_template_id: pillar.sub_assessment_template_id,
      parent_assessment_id: assessmentId,
      sub_assessment_for_pillar: pillar.code,
      status: 'not_started',
      language: assessment.language || 'pt'
    });

    created.push({
      subAssessmentId: subAssessment.id,
      pillar: pillar.code,
      score
    });
  }

  if (!created.length) {
    return { skipped: true, reason: 'No sub-assessment needed', skippedItems: skipped };
  }

  return { success: true, created, skipped };
}

export function parsePillarScores(rawPillarScores) {
  if (Array.isArray(rawPillarScores)) return rawPillarScores;

  try {
    return JSON.parse(rawPillarScores || '[]');
  } catch {
    return [];
  }
}
