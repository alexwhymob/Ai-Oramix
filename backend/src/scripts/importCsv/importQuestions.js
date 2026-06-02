import { connectDb, disconnectDb } from '../../config/db.js';
import { Question } from '../../models/index.js';
import {
  emptyToNull,
  getProjectCsvPath,
  pickBaseFields,
  printImportReport,
  readCsvRecords,
  toNumber,
  upsertRecords
} from './importUtils.js';

export function mapQuestionRecord(record) {
  return {
    ...pickBaseFields(record),
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
    subsection_en: emptyToNull(record.subsection_en)
  };
}

export async function importQuestions(filePath = getProjectCsvPath('Question_export.csv')) {
  const records = await readCsvRecords(filePath);

  return upsertRecords({
    Model: Question,
    records,
    mapRecord: mapQuestionRecord,
    requiredFields: ['id', 'pillar_code', 'code', 'text_pt'],
    entityName: 'Question'
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await connectDb();
    const report = await importQuestions();
    printImportReport(report);
    await disconnectDb();
    process.exit(report.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    await disconnectDb();
    process.exit(1);
  }
}
