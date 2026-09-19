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
  User,
  LlmAuditLog
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
  User,
  LlmAuditLog
};

export function getEntityModel(entityName) {
  return entityRegistry[entityName] || null;
}
