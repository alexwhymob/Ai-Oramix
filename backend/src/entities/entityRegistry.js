import {
  Assessment,
  AssessmentTemplate,
  AssessmentAnswer,
  ConsultantNote,
  Customer,
  Pillar,
  Question,
  Report,
  User
} from '../models/index.js';

export const entityRegistry = {
  Customer,
  Assessment,
  AssessmentTemplate,
  AssessmentAnswer,
  Pillar,
  Question,
  Report,
  ConsultantNote,
  User
};

export function getEntityModel(entityName) {
  return entityRegistry[entityName] || null;
}
