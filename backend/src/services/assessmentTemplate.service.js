import { AssessmentTemplate, Pillar } from '../models/index.js';

export async function getAssessmentTemplateById(templateId) {
  if (!templateId) return null;
  return AssessmentTemplate.findOne({ id: templateId }).lean();
}

export async function assertAssessmentTemplateExists(templateId) {
  if (!templateId) return null;

  const template = await getAssessmentTemplateById(templateId);
  if (template) return template;

  const error = new Error('assessment_template_not_found');
  error.status = 404;
  error.code = 'assessment_template_not_found';
  throw error;
}

export async function syncAssessmentTemplatePillarCount(templateId) {
  if (!templateId) return null;

  const pillarCount = await Pillar.countDocuments({
    assessment_type: 'main',
    assessment_template_id: templateId
  });

  await AssessmentTemplate.updateOne(
    { id: templateId },
    { $set: { pillar_count: pillarCount } },
    { runValidators: true }
  );

  return pillarCount;
}
