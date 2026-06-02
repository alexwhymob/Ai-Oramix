import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const assessmentAnswerSchema = new mongoose.Schema({
  ...baseFields,
  assessment_id: { type: String, required: true, index: true },
  question_id: { type: String, required: true, index: true },
  question_code: { type: String, default: null },
  pillar_code: { type: String, default: null, index: true },
  value: { type: Number, required: true, min: 1, max: 5 }
}, schemaOptions);

assessmentAnswerSchema.index({ assessment_id: 1, question_id: 1 });
assessmentAnswerSchema.index({ assessment_id: 1, pillar_code: 1 });

touchUpdatedDate(assessmentAnswerSchema);

export const AssessmentAnswer = mongoose.model('AssessmentAnswer', assessmentAnswerSchema);
