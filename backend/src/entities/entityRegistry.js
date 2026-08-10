import {
  Assessment,
  AssessmentTemplate,
  AssessmentAnswer,
  PresentationTemplate,
  ReportTemplate,
  ReportSection,
  NotificationTemplate,
  MaturityPreset,
  MaturityLevel,
  HtmlReportConfig,
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
  PresentationTemplate,
  ReportTemplate,
  ReportSection,
  NotificationTemplate,
  MaturityPreset,
  MaturityLevel,
  HtmlReportConfig,
  Pillar,
  Question,
  Report,
  ConsultantNote,
  User
};

export function getEntityModel(entityName) {
  return entityRegistry[entityName] || null;
}
