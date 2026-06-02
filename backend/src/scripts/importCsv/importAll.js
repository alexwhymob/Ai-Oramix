import { connectDb, disconnectDb } from '../../config/db.js';
import { printImportReport } from './importUtils.js';
import { importAssessmentAnswers } from './importAssessmentAnswers.js';
import { importPillars } from './importPillars.js';
import { importQuestions } from './importQuestions.js';

try {
  await connectDb();

  const reports = [
    await importPillars(),
    await importQuestions(),
    await importAssessmentAnswers()
  ];

  reports.forEach(printImportReport);
  await disconnectDb();

  const hasErrors = reports.some(report => report.errors.length > 0);
  process.exit(hasErrors ? 1 : 0);
} catch (error) {
  console.error(error.message);
  await disconnectDb();
  process.exit(1);
}
