import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';
const schema = new mongoose.Schema({
  ...baseFields, assessment_id: { type: String, required: true, index: true }, customer_id: { type: String, required: true, index: true },
  object_key: { type: String, required: true, unique: true }, file_name: { type: String, required: true }, mime_type: { type: String, required: true }, size_bytes: { type: Number, required: true }, kind: { type: String, enum: ['presentation', 'pdf'], required: true }
}, schemaOptions);
touchUpdatedDate(schema);
export const ArchivedFile = mongoose.model('ArchivedFile', schema);
