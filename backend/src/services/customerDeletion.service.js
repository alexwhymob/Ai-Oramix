import mongoose from 'mongoose';
import { Assessment, AssessmentAnswer, ConsultantNote, Customer, Report } from '../models/index.js';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

export async function deleteCustomerCascade({ customerId, confirmation, reason }) {
  validateDeletionRequest({ customerId, confirmation, reason });

  const session = await mongoose.startSession();
  try {
    let deleted;
    await session.withTransaction(async () => {
      const customer = await Customer.findOne({ id: customerId }).session(session).lean();
      if (!customer) throwNotFound();
      if (confirmation.trim() !== customer.company) throwConfirmationMismatch();

      const directAssessments = await Assessment.find({ customer_id: customerId }).session(session).select('id').lean();
      const directIds = directAssessments.map((assessment) => assessment.id);
      const linkedSubAssessments = directIds.length
        ? await Assessment.find({ parent_assessment_id: { $in: directIds } }).session(session).select('id').lean()
        : [];
      const assessmentIds = [...new Set([...directIds, ...linkedSubAssessments.map((assessment) => assessment.id)])];

      const filter = assessmentIds.length ? { assessment_id: { $in: assessmentIds } } : null;
      const [reports, answers, notes] = await Promise.all([
        filter ? Report.countDocuments(filter).session(session) : 0,
        filter ? AssessmentAnswer.countDocuments(filter).session(session) : 0,
        filter ? ConsultantNote.countDocuments(filter).session(session) : 0
      ]);

      if (filter) {
        await Promise.all([
          Report.deleteMany(filter).session(session),
          AssessmentAnswer.deleteMany(filter).session(session),
          ConsultantNote.deleteMany(filter).session(session),
          Assessment.deleteMany({ id: { $in: assessmentIds } }).session(session)
        ]);
      }
      await Customer.deleteOne({ id: customerId }).session(session);

      deleted = {
        customer: 1,
        assessments: assessmentIds.length,
        reports,
        answers,
        consultantNotes: notes
      };
    });
    return { deleted, reason: reason.trim() };
  } finally {
    await session.endSession();
  }
}

export function validateDeletionRequest({ customerId, confirmation, reason } = {}) {
  if (!customerId || typeof customerId !== 'string') {
    const error = new Error('customerId is required');
    error.status = 400;
    error.code = 'customer_id_required';
    throw error;
  }
  if (!confirmation || typeof confirmation !== 'string') {
    const error = new Error('Type the company name to confirm deletion');
    error.status = 400;
    error.code = 'deletion_confirmation_required';
    throw error;
  }
  const normalizedReason = String(reason || '').trim();
  if (normalizedReason.length < MIN_REASON_LENGTH || normalizedReason.length > MAX_REASON_LENGTH) {
    const error = new Error(`A deletion reason must contain ${MIN_REASON_LENGTH}-${MAX_REASON_LENGTH} characters`);
    error.status = 400;
    error.code = 'deletion_reason_invalid';
    throw error;
  }
}

function throwNotFound() {
  const error = new Error('Customer not found');
  error.status = 404;
  error.code = 'customer_not_found';
  throw error;
}

function throwConfirmationMismatch() {
  const error = new Error('The company name confirmation does not match');
  error.status = 400;
  error.code = 'deletion_confirmation_mismatch';
  throw error;
}
