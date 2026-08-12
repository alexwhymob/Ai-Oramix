import { handleQuizSessionAction } from '../services/quizSession.service.js';
import { createDataSubAssessment } from '../services/subAssessment.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';
import { generateReport } from '../services/reportGeneration.service.js';
import { sendReport } from '../services/reportEmail.service.js';
import { exportPresentation } from '../services/presentationExport.service.js';
import { applyFunctionWriteDefaults, assertFunctionAccess } from '../entities/entityAccess.js';
import { notifyAssessmentSubmitted } from '../services/pushNotification.service.js';

const AUDIT_ACTIONS = {
  registerCustomer: 'quiz.register_customer',
  adminRegister: 'quiz.admin_register',
  load: 'quiz.load',
  submit: 'quiz.submit',
  loadSub: 'quiz.load_sub',
  submitSub: 'quiz.submit_sub',
  getResult: 'quiz.get_result',
  getSubAssessments: 'quiz.get_sub_assessments',
  getSubResult: 'quiz.get_sub_result'
};

export async function invokeFunction(req, res, next) {
  try {
    const { functionName } = req.params;

    if (functionName === 'quizSession') {
      assertFunctionAccess({ functionName, action: req.body?.action, user: req.user });
      const payload = applyFunctionWriteDefaults({ functionName, payload: req.body, user: req.user });
      const result = await handleQuizSessionAction(payload);
      if ((payload.action === 'submit' || payload.action === 'submitSub') && result.completedNow) {
        await notifyAssessmentSubmitted(result.assessmentId || payload.assessmentId);
      }
      await writeAuditLog({
        req,
        action: AUDIT_ACTIONS[payload?.action] || 'quiz.unknown',
        entity: resolveAuditEntity(payload?.action),
        entity_id: payload?.assessmentId || null,
        metadata: {
          action: payload?.action,
          hasForm: Boolean(payload?.form),
          answersCount: Array.isArray(payload?.answers) ? payload.answers.length : undefined
        }
      });
      res.json(result);
      return;
    }

    if (functionName === 'createDataSubAssessment') {
      const result = await createDataSubAssessment(req.body);
      const createdCount = Array.isArray(result.created) ? result.created.length : 0;
      const firstCreatedId = result.subAssessmentId || result.created?.[0]?.subAssessmentId || null;
      await writeAuditLog({
        req,
        action: result.success ? 'sub_assessment.create' : 'sub_assessment.skip',
        entity: 'Assessment',
        entity_id: firstCreatedId || req.body?.event?.entity_id || null,
        metadata: {
          parentAssessmentId: req.body?.event?.entity_id,
          reason: result.reason,
          createdCount,
          created: result.created,
          skipped: result.skippedItems || result.skipped
        }
      });
      res.json(result);
      return;
    }

    if (functionName === 'generateReport') {
      const result = await generateReport(req.body, { actor: req.user });
      await writeAuditLog({
        req,
        action: 'report.generate',
        entity: 'Report',
        entity_id: result.reportId || null,
        metadata: {
          assessmentId: req.body?.assessmentId || null,
          language: req.body?.language || 'pt',
          sections: req.body?.sections || null
        }
      });
      res.json(result);
      return;
    }

    if (functionName === 'sendReport') {
      const result = await sendReport(req.body, { actor: req.user });
      await writeAuditLog({
        req,
        action: 'report.send',
        entity: 'Assessment',
        entity_id: req.body?.assessmentId || null,
        metadata: {
          to: result.to,
          provider: result.provider,
          messageId: result.messageId
        }
      });
      res.json(result);
      return;
    }

    if (functionName === 'exportPresentation') {
      const result = await exportPresentation(req.body, { actor: req.user });
      await writeAuditLog({
        req,
        action: 'report.export_presentation',
        entity: 'Assessment',
        entity_id: req.body?.assessmentId || null,
        metadata: {
          presentationTemplateId: req.body?.presentationTemplateId || null,
          language: req.body?.language || 'pt',
          fileName: result.fileName
        }
      });
      res.json(result);
      return;
    }

    const error = new Error(`Function ${functionName} is not migrated yet`);
    error.status = 501;
    error.code = 'function_not_migrated';
    throw error;
  } catch (error) {
    next(error);
  }
}

function resolveAuditEntity(action) {
  if (action === 'registerCustomer' || action === 'adminRegister') return 'Customer';
  if (action?.toLowerCase().includes('sub') || action === 'submit' || action === 'load' || action === 'getResult') return 'Assessment';
  return null;
}
