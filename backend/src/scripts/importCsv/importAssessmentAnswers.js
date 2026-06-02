import { connectDb, disconnectDb } from '../../config/db.js';
import { AssessmentAnswer } from '../../models/index.js';
import {
  emptyToNull,
  getProjectCsvPath,
  pickBaseFields,
  printImportReport,
  readCsvRecords,
  toNumber,
  upsertRecords
} from './importUtils.js';

export function mapAssessmentAnswerRecord(record) {
  return {
    ...pickBaseFields(record),
    assessment_id: record.assessment_id,
    question_id: record.question_id,
    question_code: emptyToNull(record.question_code),
    pillar_code: emptyToNull(record.pillar_code),
    value: toNumber(record.value)
  };
}

export async function importAssessmentAnswers(filePath = getProjectCsvPath('AssessmentAnswer_export.csv')) {
  const records = await readCsvRecords(filePath);

  return upsertRecords({
    Model: AssessmentAnswer,
    records,
    mapRecord: mapAssessmentAnswerRecord,
    requiredFields: ['id', 'assessment_id', 'question_id', 'value'],
    entityName: 'AssessmentAnswer'
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await connectDb();
    const report = await importAssessmentAnswers();
    printImportReport(report);
    await disconnectDb();
    process.exit(report.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    await disconnectDb();
    process.exit(1);
  }
}
