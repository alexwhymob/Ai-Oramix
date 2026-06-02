import {
  Assessment,
  Customer,
  Report
} from '../models/index.js';
import { sendEmail } from './email/emailClient.js';
import { getMaturityLabel } from './reportGeneration.service.js';

export const sendReport = createSendReport();

export function createSendReport(deps = {}) {
  const models = {
    Assessment: deps.Assessment || Assessment,
    Customer: deps.Customer || Customer,
    Report: deps.Report || Report
  };
  const email = deps.email || { sendEmail };

  return async function runSendReport(payload = {}, options = {}) {
    const actor = options.actor || null;
    assertSendReportPermissions(actor);

    const assessmentId = payload.assessmentId;
    if (!assessmentId) {
      const error = new Error('assessmentId is required');
      error.code = 'missing_assessment_id';
      error.status = 400;
      throw error;
    }

    const assessment = await models.Assessment.findOne({ id: assessmentId }).lean();
    if (!assessment) {
      const error = new Error('Assessment not found');
      error.code = 'not_found';
      error.status = 404;
      throw error;
    }

    const [customer, report] = await Promise.all([
      models.Customer.findOne({ id: assessment.customer_id }).lean(),
      models.Report.findOne({ assessment_id: assessmentId }).lean()
    ]);

    if (!customer?.email) {
      const error = new Error('Customer email not found');
      error.code = 'customer_email_not_found';
      error.status = 400;
      throw error;
    }

    if (!report) {
      const error = new Error('Report not found for assessment');
      error.code = 'report_not_found';
      error.status = 404;
      throw error;
    }

    const message = buildReportReadyEmail({
      assessment,
      customer,
      appUrl: payload.appUrl
    });
    const delivery = await email.sendEmail({
      to: customer.email,
      subject: message.subject,
      text: message.text
    });

    return {
      success: true,
      to: customer.email,
      provider: delivery?.provider || null,
      messageId: delivery?.id || null
    };
  };
}

export function buildReportReadyEmail({ assessment, customer, appUrl = null }) {
  const language = customer.language === 'en' ? 'en' : 'pt';
  const isPt = language === 'pt';
  const maturityLabel = getMaturityLabel(assessment.global_score, language);
  const score = formatScore(assessment.global_score);

  const subject = isPt
    ? `O seu Relatorio de Maturidade em IA esta pronto - ${customer.company}`
    : `Your AI Readiness Report is ready - ${customer.company}`;

  const accessLine = appUrl
    ? (isPt
      ? `Pode aceder a ferramenta aqui: ${appUrl}`
      : `You can access the tool here: ${appUrl}`)
    : (isPt
      ? 'Entre em contacto com a equipa Oramix para aceder ao relatorio completo.'
      : 'Please contact the Oramix team to access the full report.');

  const text = isPt
    ? [
      `Caro/a ${customer.name},`,
      '',
      'O seu Relatorio de Maturidade em IA esta pronto.',
      '',
      `Score Global: ${score}/5.0`,
      `Nivel de Maturidade: ${maturityLabel}`,
      '',
      accessLine,
      '',
      'Com os melhores cumprimentos,',
      'Equipa Oramix'
    ].join('\n')
    : [
      `Dear ${customer.name},`,
      '',
      'Your AI Readiness Report is ready.',
      '',
      `Global Score: ${score}/5.0`,
      `Maturity Level: ${maturityLabel}`,
      '',
      accessLine,
      '',
      'Best regards,',
      'Oramix Team'
    ].join('\n');

  return { subject, text };
}

function assertSendReportPermissions(actor) {
  if (!actor) {
    const error = new Error('Authentication required');
    error.code = 'auth_required';
    error.status = 401;
    throw error;
  }

  if (!['admin', 'account_manager'].includes(actor.role)) {
    const error = new Error('Forbidden');
    error.code = 'forbidden';
    error.status = 403;
    throw error;
  }
}

function formatScore(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return '0.00';
  return Number(score).toFixed(2);
}
