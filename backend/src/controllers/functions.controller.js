import { handleQuizSessionAction } from '../services/quizSession.service.js';
import { createDataSubAssessment } from '../services/subAssessment.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';
import { generateReport } from '../services/reportGeneration.service.js';
import { sendReport } from '../services/reportEmail.service.js';
import { exportPresentation } from '../services/presentationExport.service.js';
import { applyFunctionWriteDefaults, assertFunctionAccess } from '../entities/entityAccess.js';
import { notifyAssessmentSubmitted } from '../services/pushNotification.service.js';
import { sendAssessmentCompletionEmail, sendAssessmentStartEmail } from '../services/assessmentNotification.service.js';
import { parseResultAccess, setResultAccessCookie } from '../services/publicAssessmentAccess.service.js';
import { deleteCustomerCascade } from '../services/customerDeletion.service.js';
import { withSpan } from '../telemetry/tracing.js';

const AUDIT_ACTIONS = {
  registerCustomer: 'quiz.register_customer',
  adminRegister: 'quiz.admin_register',
  load: 'quiz.load',
  submit: 'quiz.submit',
  saveDraft: 'quiz.save_draft',
  loadSub: 'quiz.load_sub',
  submitSub: 'quiz.submit_sub',
  getResult: 'quiz.get_result',
  getSubAssessments: 'quiz.get_sub_assessments',
  getSubResult: 'quiz.get_sub_result',
  exchangeResultAccess: 'quiz.result_access_exchanged',
  issueSubAccess: 'quiz.sub_access_issued',
  renewResultAccess: 'quiz.result_access_renewed',
  renewInputAccess: 'quiz.input_access_renewed'
};

export async function invokeFunction(req, res, next) {
  try {
    const { functionName } = req.params;

    if (functionName === 'deleteCustomerCascade') {
      assertFunctionAccess({ functionName, user: req.user });
      const result = await deleteCustomerCascade(req.body || {});
      await writeAuditLog({
        req,
        action: 'customer.delete_cascade',
        entity: 'Customer',
        entity_id: req.body.customerId,
        metadata: { reason: result.reason, deleted: result.deleted }
      });
      res.json({ success: true, deleted: result.deleted });
      return;
    }

    if (functionName === 'quizSession') {
      assertFunctionAccess({ functionName, action: req.body?.action, user: req.user });
      const payload = applyFunctionWriteDefaults({
        functionName,
        payload: { ...req.body, resultAccess: parseResultAccess(req), actor: req.user },
        user: req.user
      });
      const result = await withSpan(`quiz.${payload.action}`, {
        'app.operation': 'quiz_session',
        'app.quiz.action': payload.action || 'unknown'
      }, () => handleQuizSessionAction(payload));
      if (payload.action === 'registerCustomer') {
        try {
          await sendAssessmentStartEmail(result.assessmentId, result.accessToken);
        } catch (emailError) {
          // Registration must still succeed if the mail provider is temporarily unavailable.
          console.error('Assessment start email failed:', emailError.message);
        }
      }
      if (payload.action === 'exchangeResultAccess') {
        setResultAccessCookie(res, result);
        await writeAuditLog({ req, action: AUDIT_ACTIONS[payload.action], entity: 'Assessment', entity_id: result.assessmentId });
        res.json({ success: true, assessmentId: result.assessmentId });
        return;
      }
      if ((payload.action === 'submit' || payload.action === 'submitSub') && result.completedNow) {
        await notifyAssessmentSubmitted(result.assessmentId || payload.assessmentId);
        try {
          await sendAssessmentCompletionEmail(result.assessmentId || payload.assessmentId);
        } catch (emailError) {
          console.error('Assessment completion email failed:', emailError.message);
        }
        if (payload.action === 'submit') {
          await createDataSubAssessment({ event: { entity_id: result.assessmentId } });
        }
      }
      await writeAuditLog({
        req,
        action: AUDIT_ACTIONS[payload?.action] || 'quiz.unknown',
        entity: resolveAuditEntity(payload?.action),
        entity_id: payload?.assessmentId || result?.assessmentId || null,
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
      if (!req.user) {
        const error = new Error('Authentication required');
        error.status = 401;
        error.code = 'auth_required';
        throw error;
      }
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
      const result = await withSpan('report.generate', { 'app.operation': 'report_generate' }, () => generateReport(req.body, { actor: req.user }));
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
      const result = await withSpan('report.send_email', { 'app.operation': 'report_send_email' }, () => sendReport(req.body, { actor: req.user }));
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
      const result = await withSpan('report.export_presentation', { 'app.operation': 'report_export_presentation' }, () => exportPresentation(req.body, { actor: req.user }));
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
