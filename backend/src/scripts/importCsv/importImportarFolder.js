import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from '../../config/db.js';
import { AssessmentTemplate, Pillar, Question } from '../../models/index.js';
import { emptyToNull, readCsvRecords, toDate, toNumber } from './importUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../..');
const importarDir = path.join(projectRoot, 'importar');

function resolveImportarCsv(fileName) {
  return path.join(importarDir, fileName);
}

function mapTemplateRecord(record) {
  return {
    id: record.id,
    code: record.code,
    template_type: emptyToNull(record.template_type) || 'assessment',
    name_pt: record.name_pt,
    name_en: emptyToNull(record.name_en),
    tagline_pt: emptyToNull(record.tagline_pt),
    tagline_en: emptyToNull(record.tagline_en),
    description_pt: emptyToNull(record.description_pt),
    description_en: emptyToNull(record.description_en),
    pitch_pt: emptyToNull(record.pitch_pt),
    pitch_en: emptyToNull(record.pitch_en),
    report_security_pt: emptyToNull(record.report_security_pt),
    report_security_en: emptyToNull(record.report_security_en),
    pillar_count: toNumber(record.pillar_count) ?? 0,
    active: String(record.active).toLowerCase() === 'true',
    order: toNumber(record.order) ?? 0,
    created_date: toDate(record.created_date),
    updated_date: toDate(record.updated_date),
    created_by_id: emptyToNull(record.created_by_id)
  };
}

function mapPillarRecord(record, targetTemplateId) {
  return {
    id: record.id,
    code: record.code,
    name_pt: record.name_pt,
    name_en: emptyToNull(record.name_en),
    weight: toNumber(record.weight),
    order: toNumber(record.order),
    icon: emptyToNull(record.icon),
    description_pt: emptyToNull(record.description_pt),
    description_en: emptyToNull(record.description_en),
    assessment_type: record.assessment_type || 'main',
    assessment_template_id: targetTemplateId,
    created_date: toDate(record.created_date),
    updated_date: toDate(record.updated_date),
    created_by_id: emptyToNull(record.created_by_id)
  };
}

function mapQuestionRecord(record) {
  return {
    id: record.id,
    pillar_code: record.pillar_code,
    code: record.code,
    text_pt: record.text_pt,
    text_en: emptyToNull(record.text_en),
    anchor_1_pt: emptyToNull(record.anchor_1_pt),
    anchor_2_pt: emptyToNull(record.anchor_2_pt),
    anchor_3_pt: emptyToNull(record.anchor_3_pt),
    anchor_4_pt: emptyToNull(record.anchor_4_pt),
    anchor_5_pt: emptyToNull(record.anchor_5_pt),
    anchor_1_en: emptyToNull(record.anchor_1_en),
    anchor_2_en: emptyToNull(record.anchor_2_en),
    anchor_3_en: emptyToNull(record.anchor_3_en),
    anchor_4_en: emptyToNull(record.anchor_4_en),
    anchor_5_en: emptyToNull(record.anchor_5_en),
    order: toNumber(record.order),
    subsection_pt: emptyToNull(record.subsection_pt),
    subsection_en: emptyToNull(record.subsection_en),
    created_date: toDate(record.created_date),
    updated_date: toDate(record.updated_date),
    created_by_id: emptyToNull(record.created_by_id)
  };
}

async function importMissingFromImportar() {
  const templateRecords = await readCsvRecords(resolveImportarCsv('AssessmentTemplate_export.csv'));
  const pillarRecords = await readCsvRecords(resolveImportarCsv('Pillar_export (2).csv'));
  const questionRecords = await readCsvRecords(resolveImportarCsv('Question_export (1).csv'));

  const report = {
    templatesInserted: 0,
    pillarsInserted: 0,
    pillarsLinked: 0,
    questionsInserted: 0
  };

  const csvTemplateIdToCode = new Map(templateRecords.map((record) => [record.id, record.code]));

  for (const record of templateRecords) {
    const existing = await AssessmentTemplate.findOne({ code: record.code });
    if (existing) continue;

    await AssessmentTemplate.create(mapTemplateRecord(record));
    report.templatesInserted += 1;
  }

  const templates = await AssessmentTemplate.find({}, { id: 1, code: 1, _id: 0 }).lean();
  const templateCodeToId = new Map(templates.map((template) => [template.code, template.id]));

  for (const record of pillarRecords) {
    const templateCode = csvTemplateIdToCode.get(record.assessment_template_id);
    const targetTemplateId = templateCode ? templateCodeToId.get(templateCode) : null;

    const existing = await Pillar.findOne({
      code: record.code,
      assessment_type: record.assessment_type || 'main',
      assessment_template_id: targetTemplateId
    });

    if (existing) continue;

    if ((record.assessment_type || 'main') === 'sub_assessment' && targetTemplateId) {
      const legacySubAssessmentPillar = await Pillar.findOne({
        code: record.code,
        assessment_type: 'sub_assessment'
      });

      if (legacySubAssessmentPillar) {
        await Pillar.updateOne(
          { id: legacySubAssessmentPillar.id },
          {
            $set: {
              ...mapPillarRecord(record, targetTemplateId),
              id: legacySubAssessmentPillar.id
            }
          }
        );
        report.pillarsLinked += 1;
        continue;
      }
    }

    await Pillar.create(mapPillarRecord(record, targetTemplateId));
    report.pillarsInserted += 1;
  }

  for (const record of questionRecords) {
    const existing = await Question.findOne({
      code: record.code,
      pillar_code: record.pillar_code
    });

    if (existing) continue;

    await Question.create(mapQuestionRecord(record));
    report.questionsInserted += 1;
  }

  return report;
}

try {
  await connectDb();
  const report = await importMissingFromImportar();
  console.log(JSON.stringify(report, null, 2));
  await disconnectDb();
  process.exit(0);
} catch (error) {
  console.error(error.message);
  await disconnectDb();
  process.exit(1);
}
