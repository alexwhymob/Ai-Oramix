import { NotificationTemplate } from '../models/index.js';
import { getMaturityLabel } from './reportGeneration.service.js';

const DEFAULT_NOTIFICATION_TEMPLATES = [
  {
    key: 'report_ready',
    name: 'Report Ready',
    description: 'Sent when the final report is ready for the customer.',
    trigger_type: 'report_ready',
    target: 'customer',
    subject_pt: 'O seu Relatorio de Maturidade em IA esta pronto - {{company}}',
    subject_en: 'Your AI Readiness Report is ready - {{company}}',
    body_pt: [
      '<p>Caro/a {{customer_name}},</p>',
      '<p>O seu Relatorio de Maturidade em IA esta pronto.</p>',
      '<p><strong>Score Global:</strong> {{global_score}}/5.0<br /><strong>Nivel de Maturidade:</strong> {{maturity_label}}</p>',
      '<p>{{app_access_line}}</p>',
      '<p>Com os melhores cumprimentos,<br />Equipa Oramix</p>'
    ].join(''),
    body_en: [
      '<p>Dear {{customer_name}},</p>',
      '<p>Your AI Readiness Report is ready.</p>',
      '<p><strong>Global Score:</strong> {{global_score}}/5.0<br /><strong>Maturity Level:</strong> {{maturity_label}}</p>',
      '<p>{{app_access_line}}</p>',
      '<p>Best regards,<br />Oramix Team</p>'
    ].join(''),
    from_email: 'Oramix Assessment Platform <aireadiness@oramix.pt>',
    is_active: true,
    order: 1
  },
  {
    key: 'completion',
    name: 'Assessment Completed',
    description: 'Template placeholder for completion confirmations.',
    trigger_type: 'immediate',
    target: 'customer',
    subject_pt: 'Recebemos a sua avaliacao - {{company}}',
    subject_en: 'We received your assessment - {{company}}',
    body_pt: '<p>Ola {{customer_name}}, recebemos a sua avaliacao. Em breve entraremos em contacto.</p>',
    body_en: '<p>Hello {{customer_name}}, we received your assessment. We will contact you shortly.</p>',
    from_email: 'Oramix Assessment Platform <aireadiness@oramix.pt>',
    is_active: true,
    order: 2
  },
  {
    key: 'assessment_started',
    name: 'Assessment Access Link',
    description: 'Sent when a lead starts an assessment, with a 48-hour access link.',
    trigger_type: 'immediate',
    target: 'customer',
    subject_pt: 'O seu acesso a avaliacao - {{company}}',
    subject_en: 'Your assessment access - {{company}}',
    body_pt: '<p>Ola {{customer_name}},</p><p>Pode iniciar ou retomar a sua avaliacao para {{company}} aqui: <a href="{{quiz_link}}">abrir avaliacao</a>.</p><p>Por motivos de seguranca, este link expira em <strong>{{access_expires_at}}</strong>. As suas respostas ficam guardadas enquanto o acesso estiver ativo.</p><p>Se o link expirar, contacte o seu account manager para receber um novo acesso.</p><p>Equipa Oramix</p>',
    body_en: '<p>Hello {{customer_name}},</p><p>You can start or resume your assessment for {{company}} here: <a href="{{quiz_link}}">open assessment</a>.</p><p>For security, this link expires on <strong>{{access_expires_at}}</strong>. Your responses are saved while access is active.</p><p>If the link expires, please contact your account manager to receive a new one.</p><p>Oramix Team</p>',
    from_email: 'Oramix Assessment Platform <aireadiness@oramix.pt>',
    is_active: true,
    order: 3
  },
  {
    key: 'incomplete_reminder',
    name: 'Incomplete Assessment Reminder',
    description: 'Sent 24 hours after an assessment was started but not completed.',
    trigger_type: 'scheduled_24h',
    target: 'customer',
    subject_pt: 'Conclua a sua avaliacao de maturidade - {{company}}',
    subject_en: 'Complete your maturity assessment - {{company}}',
    body_pt: '<p>Ola {{customer_name}},</p><p>A sua avaliacao para {{company}} ficou por concluir. Pode retoma-la aqui: <a href="{{quiz_link}}">continuar avaliacao</a>.</p><p>O acesso expira em <strong>{{access_expires_at}}</strong>.</p><p>Equipa Oramix</p>',
    body_en: '<p>Hello {{customer_name}},</p><p>Your assessment for {{company}} is still incomplete. You can continue it here: <a href="{{quiz_link}}">continue assessment</a>.</p><p>Access expires on <strong>{{access_expires_at}}</strong>.</p><p>Oramix Team</p>',
    from_email: 'Oramix Assessment Platform <aireadiness@oramix.pt>',
    is_active: true,
    order: 3
  },
  {
    key: 'presentation_scheduling',
    name: 'Presentation Scheduling Alert',
    description: 'Sent to the account manager 96 hours after a report is sent.',
    trigger_type: 'scheduled_96h',
    target: 'account_manager',
    subject_pt: 'Agendar apresentacao do relatorio - {{company}}',
    subject_en: 'Schedule report presentation - {{company}}',
    body_pt: '<p>Ola {{am_name}},</p><p>O relatorio de maturidade de {{company}} foi enviado ha 96 horas. Contacte {{customer_name}} para agendar a apresentacao.</p><p>{{booking_url}}</p>',
    body_en: '<p>Hello {{am_name}},</p><p>{{company}}\'s maturity report was sent 96 hours ago. Please contact {{customer_name}} to schedule the presentation.</p><p>{{booking_url}}</p>',
    from_email: 'Oramix Assessment Platform <aireadiness@oramix.pt>',
    is_active: true,
    order: 4
  }
];

export const ensureDefaultNotificationTemplates = createEnsureDefaultNotificationTemplates();

export function createEnsureDefaultNotificationTemplates(deps = {}) {
  const models = {
    NotificationTemplate: deps.NotificationTemplate || NotificationTemplate
  };

  return async function runEnsureDefaultNotificationTemplates() {
    for (const template of DEFAULT_NOTIFICATION_TEMPLATES) {
      await models.NotificationTemplate.updateOne(
        { key: template.key },
        { $setOnInsert: template },
        { upsert: true, runValidators: true }
      );
    }

    // Upgrade only the untouched legacy default. Custom reminder copy is never
    // overwritten, but the stock template must disclose the access expiry.
    const reminder = DEFAULT_NOTIFICATION_TEMPLATES.find((template) => template.key === 'incomplete_reminder');
    await models.NotificationTemplate.updateOne(
      {
        key: 'incomplete_reminder',
        body_pt: '<p>Ola {{customer_name}},</p><p>A sua avaliacao para {{company}} ficou por concluir. Pode retoma-la aqui: <a href="{{quiz_link}}">continuar avaliacao</a>.</p><p>Equipa Oramix</p>'
      },
      { $set: { body_pt: reminder.body_pt, body_en: reminder.body_en } }
    );
  };
}

export async function resolveNotificationTemplate(key) {
  return NotificationTemplate.findOne({ key, is_active: true }).lean();
}

export function buildTemplateVariables({ assessment, customer, appUrl = null }) {
  const language = customer?.language === 'en' ? 'en' : 'pt';
  const isPt = language === 'pt';

  return {
    customer_name: customer?.name || customer?.email || 'Customer',
    company: customer?.company || 'Oramix',
    global_score: formatScore(assessment?.global_score),
    maturity_label: getMaturityLabel(assessment?.global_score, language),
    booking_url: appUrl || '',
    quiz_link: appUrl || '',
    app_access_line: appUrl
      ? (isPt ? `Pode aceder a ferramenta aqui: ${appUrl}` : `You can access the tool here: ${appUrl}`)
      : (isPt
        ? 'Entre em contacto com a equipa Oramix para aceder ao relatorio completo.'
        : 'Please contact the Oramix team to access the full report.')
  };
}

export function buildTemplateVariablesWithMaturity({ assessment, customer, appUrl = null, maturityLabel = null }) {
  return {
    ...buildTemplateVariables({ assessment, customer, appUrl }),
    maturity_label: maturityLabel || getMaturityLabel(assessment?.global_score, customer?.language === 'en' ? 'en' : 'pt')
  };
}

export function renderNotificationTemplate(template, variables = {}, language = 'pt') {
  const isPt = language !== 'en';
  const subject = interpolateTemplate(isPt ? template.subject_pt : (template.subject_en || template.subject_pt), variables);
  const html = interpolateTemplate(isPt ? template.body_pt : (template.body_en || template.body_pt), variables);
  const text = htmlToText(html);

  return {
    subject,
    html,
    text,
    from_email: template.from_email || null
  };
}

function interpolateTemplate(content, variables) {
  return String(content || '').replace(/\{\{(\w+)\}\}/g, (_match, key) => escapeHtml(variables[key] ?? ''));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatScore(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return '0.00';
  return Number(score).toFixed(2);
}
