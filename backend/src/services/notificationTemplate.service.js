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
    from_email: 'Oramix AI Readiness <aireadiness@oramix.pt>',
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
    from_email: 'Oramix AI Readiness <aireadiness@oramix.pt>',
    is_active: true,
    order: 2
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
  return String(content || '').replace(/\{\{(\w+)\}\}/g, (_match, key) => variables[key] ?? '');
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
