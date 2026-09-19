import {
  Assessment,
  Customer,
  NotificationTemplate,
  User
} from '../models/index.js';
import { env } from '../config/env.js';
import { sendEmail } from './email/emailClient.js';
import { getInputAccessLink, issueInputAccess } from './quizSession.service.js';
import {
  buildTemplateVariables,
  renderNotificationTemplate
} from './notificationTemplate.service.js';

const HOUR_MS = 60 * 60 * 1000;
const CLAIM_TIMEOUT_MS = 30 * 60 * 1000;

export function startAssessmentNotificationScheduler() {
  if (!env.SCHEDULER_ENABLED || env.NODE_ENV === 'test') return null;

  const run = () => {
    runScheduledAssessmentNotifications().catch((error) => {
      console.error('Scheduled assessment notifications failed:', error.message);
    });
  };

  run();
  const timer = setInterval(run, env.SCHEDULER_INTERVAL_MINUTES * 60 * 1000);
  timer.unref();
  return timer;
}

export async function sendAssessmentCompletionEmail(assessmentId, deps = {}) {
  const models = getModels(deps);
  const assessment = await models.Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment || assessment.assessment_type === 'sub_assessment') return { skipped: true };
  if (assessment.completion_email_sent_at) return { skipped: true, reason: 'already_sent' };

  const customer = await models.Customer.findOne({ id: assessment.customer_id }).lean();
  if (!customer?.email) return { skipped: true, reason: 'customer_email_missing' };

  const message = await buildNotificationMessage({
    templateKey: 'completion',
    assessment,
    customer,
    models,
    variables: await buildVariables({ assessment, customer, models })
  });
  const delivery = await getEmail(deps).sendEmail({
    to: customer.email,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
    ...(message.from_email ? { from: message.from_email } : {})
  });

  await models.Assessment.updateOne(
    { id: assessment.id, completion_email_sent_at: null },
    { $set: { completion_email_sent_at: new Date() } }
  );
  return { success: true, to: customer.email, delivery };
}

export async function sendAssessmentStartEmail(assessmentId, accessToken, deps = {}) {
  const models = getModels(deps);
  const assessment = await models.Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment || assessment.assessment_type === 'sub_assessment' || assessment.start_email_sent_at) return { skipped: true };
  const customer = await models.Customer.findOne({ id: assessment.customer_id }).lean();
  if (!customer?.email || !accessToken) return { skipped: true, reason: 'customer_email_or_access_missing' };

  const quizLink = `${env.FRONTEND_URL}/quiz/${accessToken}`;
  const message = await buildNotificationMessage({
    templateKey: 'assessment_started',
    assessment,
    customer,
    models,
    variables: await buildVariables({ assessment, customer, models, quizLink })
  });
  const delivery = await deliverMessage({ to: customer.email, message, deps });
  await models.Assessment.updateOne(
    { id: assessment.id, start_email_sent_at: null },
    { $set: { start_email_sent_at: new Date() } }
  );
  return { success: true, to: customer.email, delivery };
}

export async function runScheduledAssessmentNotifications(deps = {}) {
  const reminder = await sendIncompleteAssessmentReminders(deps);
  const presentation = await sendPresentationSchedulingAlerts(deps);
  return { reminder, presentation };
}

async function sendIncompleteAssessmentReminders(deps) {
  const models = getModels(deps);
  const cutoff = new Date(Date.now() - 24 * HOUR_MS);
  return processClaims({
    models,
    sentField: 'reminder_sent_at',
    sendingField: 'reminder_sending_at',
    filter: {
      status: 'in_progress',
      assessment_type: { $ne: 'sub_assessment' },
      started_at: { $lt: cutoff }
    },
    send: async (assessment) => {
      const customer = await models.Customer.findOne({ id: assessment.customer_id }).lean();
      if (!customer?.email) return { skipped: true };
      // New assessments use a signed token that can be recreated without
      // storing it. Legacy drafts receive one expiring token on their first
      // reminder, after which their old permanent QR token is rejected.
      const accessToken = getInputAccessLink(assessment) || await issueInputAccess(assessment.id);
      const quizLink = `${env.FRONTEND_URL}/quiz/${accessToken}`;
      const message = await buildNotificationMessage({
        templateKey: 'incomplete_reminder',
        assessment,
        customer,
        models,
        variables: await buildVariables({ assessment, customer, models, quizLink })
      });
      return deliverMessage({ to: customer.email, message, deps });
    }
  });
}

async function sendPresentationSchedulingAlerts(deps) {
  const models = getModels(deps);
  const cutoff = new Date(Date.now() - 96 * HOUR_MS);
  return processClaims({
    models,
    sentField: 'presentation_alert_sent_at',
    sendingField: 'presentation_alert_sending_at',
    filter: {
      status: 'completed',
      assessment_type: { $ne: 'sub_assessment' },
      report_sent_at: { $lt: cutoff }
    },
    send: async (assessment) => {
      const customer = await models.Customer.findOne({ id: assessment.customer_id }).lean();
      if (!customer) return { skipped: true };
      const recipient = await resolveAccountManager({ customer, models });
      if (!recipient?.email) return { skipped: true };
      const message = await buildNotificationMessage({
        templateKey: 'presentation_scheduling',
        assessment,
        customer,
        models,
        variables: {
          ...(await buildVariables({ assessment, customer, models })),
          am_name: recipient.full_name || recipient.email,
          booking_url: recipient.booking_url || ''
        }
      });
      return deliverMessage({ to: recipient.email, message, deps });
    }
  });
}

async function processClaims({ models, sentField, sendingField, filter, send }) {
  const result = { sent: 0, skipped: 0, failed: 0 };
  const staleClaim = new Date(Date.now() - CLAIM_TIMEOUT_MS);

  while (true) {
    const claimedAt = new Date();
    const assessment = await models.Assessment.findOneAndUpdate(
      {
        ...filter,
        [sentField]: null,
        $or: [{ [sendingField]: null }, { [sendingField]: { $lt: staleClaim } }]
      },
      { $set: { [sendingField]: claimedAt } },
      { returnDocument: 'after' }
    ).lean();

    if (!assessment) break;

    try {
      const delivery = await send(assessment);
      if (delivery?.skipped) {
        result.skipped += 1;
        await models.Assessment.updateOne({ id: assessment.id, [sendingField]: claimedAt }, { $set: { [sendingField]: null } });
        continue;
      }
      result.sent += 1;
      await models.Assessment.updateOne(
        { id: assessment.id, [sendingField]: claimedAt },
        { $set: { [sentField]: new Date(), [sendingField]: null } }
      );
    } catch (error) {
      result.failed += 1;
      console.error(`Unable to send ${sentField} for assessment ${assessment.id}:`, error.message);
      await models.Assessment.updateOne({ id: assessment.id, [sendingField]: claimedAt }, { $set: { [sendingField]: null } });
    }
  }

  return result;
}

async function buildNotificationMessage({ templateKey, assessment, customer, models, variables }) {
  const template = await models.NotificationTemplate.findOne({ key: templateKey, is_active: true }).lean();
  if (template) return renderNotificationTemplate(template, variables, customer.language);

  return fallbackMessage({ templateKey, assessment, customer, variables });
}

async function buildVariables({ assessment, customer, models, quizLink = null }) {
  const accountManager = await resolveAccountManager({ customer, models });
  const resolvedQuizLink = quizLink || '';
  return {
    ...buildTemplateVariables({ assessment, customer, appUrl: resolvedQuizLink }),
    quiz_link: resolvedQuizLink,
    access_expires_at: assessment.public_access_expires_at
      ? new Intl.DateTimeFormat(customer.language === 'en' ? 'en-GB' : 'pt-PT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(assessment.public_access_expires_at))
      : '',
    booking_url: accountManager?.booking_url || '',
    am_name: accountManager?.full_name || accountManager?.email || 'Account Manager'
  };
}

async function resolveAccountManager({ customer, models }) {
  if (customer.account_manager_id) {
    const manager = await models.User.findOne({ id: customer.account_manager_id, active: { $ne: false } }).lean();
    if (manager?.email) return manager;
  }
  return models.User.findOne({ role: 'admin', active: { $ne: false } }).sort({ created_date: 1 }).lean();
}

async function deliverMessage({ to, message, deps }) {
  const delivery = await getEmail(deps).sendEmail({
    to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
    ...(message.from_email ? { from: message.from_email } : {})
  });
  return { success: true, delivery };
}

function fallbackMessage({ templateKey, customer, variables }) {
  const isPt = customer.language !== 'en';
  if (templateKey === 'completion') {
    return {
      subject: isPt ? `Recebemos a sua avaliacao - ${customer.company}` : `We received your assessment - ${customer.company}`,
      text: isPt
        ? `Ola ${customer.name}, recebemos a sua avaliacao. Em breve entraremos em contacto.`
        : `Hello ${customer.name}, we received your assessment. We will contact you shortly.`
    };
  }
  if (templateKey === 'incomplete_reminder') {
    return {
      subject: isPt ? `Conclua a sua avaliacao - ${customer.company}` : `Complete your assessment - ${customer.company}`,
      text: isPt
        ? `Ola ${customer.name}, pode retomar a sua avaliacao aqui: ${variables.quiz_link}`
        : `Hello ${customer.name}, you can continue your assessment here: ${variables.quiz_link}`
    };
  }
  if (templateKey === 'assessment_started') {
    return {
      subject: isPt ? `A sua avaliacao esta pronta para comecar - ${customer.company}` : `Your assessment is ready to start - ${customer.company}`,
      text: isPt
        ? `Ola ${customer.name}, pode iniciar ou retomar a sua avaliacao aqui: ${variables.quiz_link}. Este link expira em ${variables.access_expires_at}.`
        : `Hello ${customer.name}, you can start or resume your assessment here: ${variables.quiz_link}. This link expires on ${variables.access_expires_at}.`
    };
  }
  return {
    subject: isPt ? `Agendar apresentacao - ${customer.company}` : `Schedule presentation - ${customer.company}`,
    text: isPt
      ? `O relatorio de ${customer.company} foi enviado ha 96 horas. Contacte ${customer.name} para agendar a apresentacao.`
      : `${customer.company}'s report was sent 96 hours ago. Contact ${customer.name} to schedule the presentation.`
  };
}

function getModels(deps) {
  return {
    Assessment: deps.Assessment || Assessment,
    Customer: deps.Customer || Customer,
    NotificationTemplate: deps.NotificationTemplate || NotificationTemplate,
    User: deps.User || User
  };
}

function getEmail(deps) {
  return deps.email || { sendEmail };
}
