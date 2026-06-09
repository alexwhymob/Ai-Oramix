import { connectDb, disconnectDb } from '../../config/db.js';
import { Pillar } from '../../models/index.js';
import {
  emptyToNull,
  getProjectCsvPath,
  pickBaseFields,
  printImportReport,
  readCsvRecords,
  toNumber,
  upsertRecords
} from './importUtils.js';

export function mapPillarRecord(record) {
  return {
    ...pickBaseFields(record),
    code: record.code,
    name_pt: record.name_pt,
    name_en: emptyToNull(record.name_en),
    weight: toNumber(record.weight),
    order: toNumber(record.order),
    icon: emptyToNull(record.icon),
    description_pt: emptyToNull(record.description_pt),
    description_en: emptyToNull(record.description_en),
    assessment_type: record.assessment_type || 'main',
    assessment_template_id: emptyToNull(record.assessment_template_id)
  };
}

export async function importPillars(filePath = getProjectCsvPath('Pillar_export.csv')) {
  const records = await readCsvRecords(filePath);

  return upsertRecords({
    Model: Pillar,
    records,
    mapRecord: mapPillarRecord,
    requiredFields: ['id', 'code', 'name_pt', 'weight'],
    entityName: 'Pillar'
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await connectDb();
    const report = await importPillars();
    printImportReport(report);
    await disconnectDb();
    process.exit(report.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(error.message);
    await disconnectDb();
    process.exit(1);
  }
}
