import { connectDb, disconnectDb } from '../config/db.js';
import { AssessmentTemplate, Pillar } from '../models/index.js';

const DEFAULT_TEMPLATE = {
  code: 'ai-readiness',
  name_pt: 'AI Readiness Assessment',
  name_en: 'AI Readiness Assessment',
  tagline_pt: 'Avaliacao base de prontidao para adocao de IA',
  tagline_en: 'Core readiness assessment for AI adoption',
  description_pt: 'Template principal para avaliacao de maturidade e prontidao em IA.',
  description_en: 'Primary template for AI readiness and maturity assessment.',
  pitch_pt: 'Diagnostico estruturado para medir a prontidao organizacional para IA.',
  pitch_en: 'Structured diagnostic to measure organizational readiness for AI.',
  report_security_pt: 'Este relatorio pode conter informacoes sensiveis e deve ser tratado de acordo com a politica interna da organizacao.',
  report_security_en: 'This report may contain sensitive information and should be handled according to the organization internal policy.',
  active: true,
  order: 1
};

async function seedAssessmentTemplates() {
  const template = await AssessmentTemplate.findOneAndUpdate(
    { code: DEFAULT_TEMPLATE.code },
    { $set: DEFAULT_TEMPLATE },
    { upsert: true, setDefaultsOnInsert: true, returnDocument: 'after' }
  );

  const assignResult = await Pillar.updateMany(
    {
      assessment_type: 'main',
      $or: [
        { assessment_template_id: null },
        { assessment_template_id: '' },
        { assessment_template_id: { $exists: false } }
      ]
    },
    { $set: { assessment_template_id: template.id } }
  );

  const pillarCount = await Pillar.countDocuments({
    assessment_type: 'main',
    assessment_template_id: template.id
  });

  template.pillar_count = pillarCount;
  await template.save();

  console.log(`Template ready: ${template.code} (${template.id})`);
  console.log(`Pillars assigned to template: ${assignResult.modifiedCount}`);
  console.log(`Current pillar count: ${pillarCount}`);
}

try {
  await connectDb();
  await seedAssessmentTemplates();
  await disconnectDb();
  process.exit(0);
} catch (error) {
  console.error(error.message);
  await disconnectDb();
  process.exit(1);
}
