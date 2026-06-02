import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './parseCsv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../../..');

export function getProjectCsvPath(fileName) {
  return path.join(projectRoot, fileName);
}

export async function readCsvRecords(filePath) {
  const content = await readFile(filePath, 'utf8');
  return parseCsv(content);
}

export function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
}

export function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function emptyToNull(value) {
  return value === undefined || value === '' ? null : value;
}

export function pickBaseFields(record) {
  return {
    id: record.id,
    created_date: toDate(record.created_date),
    updated_date: toDate(record.updated_date),
    created_by_id: emptyToNull(record.created_by_id)
  };
}

export function createImportReport(entityName) {
  return {
    entity: entityName,
    read: 0,
    inserted: 0,
    updated: 0,
    errors: []
  };
}

export function validateRequired(mappedRecord, requiredFields) {
  const missing = requiredFields.filter(field => (
    mappedRecord[field] === undefined ||
    mappedRecord[field] === null ||
    mappedRecord[field] === ''
  ));

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

export async function upsertRecords({ Model, records, mapRecord, requiredFields, entityName }) {
  const report = createImportReport(entityName);
  report.read = records.length;

  for (const [index, rawRecord] of records.entries()) {
    try {
      const mappedRecord = mapRecord(rawRecord);
      validateRequired(mappedRecord, requiredFields);

      const result = await Model.updateOne(
        { id: mappedRecord.id },
        { $set: mappedRecord },
        { upsert: true, runValidators: true }
      );

      if (result.upsertedCount > 0) {
        report.inserted += 1;
      } else {
        report.updated += 1;
      }
    } catch (error) {
      report.errors.push({
        row: index + 2,
        id: rawRecord.id || null,
        error: error.message
      });
    }
  }

  return report;
}

export function printImportReport(report) {
  console.log(JSON.stringify({
    entity: report.entity,
    read: report.read,
    inserted: report.inserted,
    updated: report.updated,
    errors: report.errors.length
  }, null, 2));

  if (report.errors.length > 0) {
    console.log(JSON.stringify({ errorDetails: report.errors }, null, 2));
  }
}
