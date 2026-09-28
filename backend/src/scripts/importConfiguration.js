import { connectDb, disconnectDb } from '../config/db.js';
import {
  AssessmentTemplate,
  MaturityLevel,
  MaturityPreset,
  NotificationTemplate,
  Pillar,
  Question,
  ReportSection,
  ReportTemplate
} from '../models/index.js';
import {
  getProjectCsvPath,
  readCsvRecords,
  upsertRecords,
  pickBaseFields,
  toDate,
  toNumber
} from './importCsv/importUtils.js';

const folder = (name) => getProjectCsvPath(`importar/${name}`);
const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

async function importCsv({ file, Model, entityName, mapRecord, requiredFields }) {
  const records = await readCsvRecords(folder(file));
  return upsertRecords({ Model, records, mapRecord, requiredFields, entityName });
}

const base = (record) => pickBaseFields(record);

const mapMaturityPreset = (record) => ({
  ...base(record),
  name: record.name,
  description: record.description || null,
  is_active: toBoolean(record.is_active, true),
  is_default: toBoolean(record.is_default),
  order: toNumber(record.order) ?? 0
});

const mapMaturityLevel = (record) => ({
  ...base(record),
  preset_id: record.preset_id,
  level: toNumber(record.level),
  min_score: toNumber(record.min_score),
  max_score: toNumber(record.max_score),
  label_pt: record.label_pt,
  label_en: record.label_en || null,
  color: record.color || '#3b82f6',
  emoji: record.emoji || null,
  recommendation_pt: record.recommendation_pt || null,
  recommendation_en: record.recommendation_en || null,
  order: toNumber(record.order) ?? 0
});

const mapReportTemplate = (record) => ({
  ...base(record),
  code: record.code,
  name: record.name,
  description: record.description || null,
  system_prompt: record.system_prompt,
  style_guide: record.style_guide || null,
  is_default: toBoolean(record.is_default),
  is_active: toBoolean(record.is_active, true),
  order: toNumber(record.order) ?? 0
});

const mapReportSection = (record) => ({
  ...base(record),
  report_template_id: record.report_template_id,
  key: record.key,
  title: record.title,
  prompt: record.prompt,
  context_keys: record.context_keys || '["org","score","pillars","answers"]',
  json_schema: record.json_schema || null,
  order: toNumber(record.order) ?? 0
});

const mapAssessmentTemplate = (record) => ({
  ...base(record),
  code: record.code,
  template_type: record.template_type || 'assessment',
  name_pt: record.name_pt,
  name_en: record.name_en || null,
  tagline_pt: record.tagline_pt || null,
  tagline_en: record.tagline_en || null,
  description_pt: record.description_pt || null,
  description_en: record.description_en || null,
  pitch_pt: record.pitch_pt || null,
  pitch_en: record.pitch_en || null,
  report_security_pt: record.report_security_pt || null,
  report_security_en: record.report_security_en || null,
  maturity_preset_id: record.maturity_preset_id || null,
  pillar_count: toNumber(record.pillar_count) ?? 0,
  active: toBoolean(record.active, true),
  order: toNumber(record.order) ?? 0
});

const mapNotificationTemplate = (record) => ({
  ...base(record),
  key: record.key,
  name: record.name,
  description: record.description || null,
  trigger_type: record.trigger_type || 'immediate',
  target: record.target || 'customer',
  subject_pt: record.subject_pt,
  subject_en: record.subject_en || null,
  body_pt: record.body_pt,
  body_en: record.body_en || null,
  from_email: record.from_email || 'Oramix <readiness@oramix.pt>',
  is_active: toBoolean(record.is_active, true),
  order: toNumber(record.order) ?? 0
});

const mapPillar = (record) => ({
  ...base(record),
  code: record.code,
  assessment_template_id: record.assessment_template_id || null,
  sub_assessment_template_id: record.sub_assessment_template_id || null,
  name_pt: record.name_pt,
  name_en: record.name_en || null,
  description_pt: record.description_pt || null,
  description_en: record.description_en || null,
  icon: record.icon || null,
  weight: toNumber(record.weight) ?? 0,
  assessment_type: record.assessment_type || 'main',
  min_score: toNumber(record.min_score),
  order: toNumber(record.order) ?? 0
});

const mapQuestion = (record) => ({
  ...base(record),
  code: record.code,
  pillar_code: record.pillar_code,
  subsection_pt: record.subsection_pt || null,
  subsection_en: record.subsection_en || null,
  text_pt: record.text_pt,
  text_en: record.text_en || null,
  anchor_1_pt: record.anchor_1_pt || null,
  anchor_2_pt: record.anchor_2_pt || null,
  anchor_3_pt: record.anchor_3_pt || null,
  anchor_4_pt: record.anchor_4_pt || null,
  anchor_5_pt: record.anchor_5_pt || null,
  anchor_1_en: record.anchor_1_en || null,
  anchor_2_en: record.anchor_2_en || null,
  anchor_3_en: record.anchor_3_en || null,
  anchor_4_en: record.anchor_4_en || null,
  anchor_5_en: record.anchor_5_en || null,
  order: toNumber(record.order) ?? 0
});

const jobs = [
  { file: 'MaturityPreset_export.csv', Model: MaturityPreset, entityName: 'MaturityPreset', mapRecord: mapMaturityPreset, requiredFields: ['id', 'name'] },
  { file: 'MaturityLevel_export.csv', Model: MaturityLevel, entityName: 'MaturityLevel', mapRecord: mapMaturityLevel, requiredFields: ['id', 'preset_id', 'level', 'min_score', 'max_score', 'label_pt'] },
  { file: 'ReportTemplate_export.csv', Model: ReportTemplate, entityName: 'ReportTemplate', mapRecord: mapReportTemplate, requiredFields: ['id', 'code', 'name', 'system_prompt'] },
  { file: 'ReportSection_export.csv', Model: ReportSection, entityName: 'ReportSection', mapRecord: mapReportSection, requiredFields: ['id', 'report_template_id', 'key', 'title', 'prompt'] },
  { file: 'AssessmentTemplate_export (3).csv', Model: AssessmentTemplate, entityName: 'AssessmentTemplate', mapRecord: mapAssessmentTemplate, requiredFields: ['id', 'code', 'name_pt'] },
  { file: 'Pillar_export (3).csv', Model: Pillar, entityName: 'Pillar', mapRecord: mapPillar, requiredFields: ['id', 'code', 'name_pt'] },
  { file: 'Question_export (5).csv', Model: Question, entityName: 'Question', mapRecord: mapQuestion, requiredFields: ['id', 'code', 'pillar_code', 'text_pt'] },
  { file: 'NotificationTemplate_export.csv', Model: NotificationTemplate, entityName: 'NotificationTemplate', mapRecord: mapNotificationTemplate, requiredFields: ['id', 'key', 'name', 'subject_pt', 'body_pt'] }
];

try {
  await connectDb();
  const reports = [];
  for (const job of jobs) reports.push(await importCsv(job));
  reports.forEach((report) => console.log(JSON.stringify(report)));
  await disconnectDb();
  process.exit(reports.some((report) => report.errors.length > 0) ? 1 : 0);
} catch (error) {
  console.error(error.message);
  await disconnectDb();
  process.exit(1);
}
