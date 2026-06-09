import { randomUUID } from 'node:crypto';
import {
  Assessment,
  AssessmentAnswer,
  Customer
} from '../models/index.js';
import {
  assertAssessmentTemplateExists,
  getAssessmentTemplateById
} from './assessmentTemplate.service.js';

const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.es', 'yahoo.it', 'yahoo.de', 'yahoo.com.br',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.es', 'hotmail.it', 'hotmail.de',
  'outlook.com', 'outlook.pt', 'outlook.com.br', 'live.com', 'live.co.uk', 'live.fr', 'msn.com', 'aol.com',
  'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'mail.com', 'email.com',
  'sapo.pt', 'clix.pt', 'net.sapo.pt', 'iol.pt', 'terra.com.br', 'uol.com.br', 'bol.com.br', 'ig.com.br',
  'yandex.com', 'yandex.ru', 'zoho.com', 'tutanota.com', 'gmx.com', 'gmx.net', 'gmx.de', 'web.de', 'inbox.com', 'fastmail.com', 'rediffmail.com'
];

export async function handleQuizSessionAction(payload) {
  switch (payload.action) {
    case 'registerCustomer':
      return registerCustomer(payload.form, {
        registered_by: 'self',
        status: 'in_progress',
        templateId: payload.templateId
      });
    case 'adminRegister':
      return adminRegister(payload.form, payload.templateId);
    case 'load':
      return loadMainSession(payload.token);
    case 'submit':
      return submitAssessment(payload);
    case 'loadSub':
      return loadSubSession(payload.assessmentId);
    case 'submitSub':
      return submitAssessment(payload);
    case 'getResult':
      return getResult(payload.assessmentId);
    case 'getSubAssessments':
      return getSubAssessments(payload.assessmentId);
    case 'getSubResult':
      return getSubResult(payload.assessmentId);
    default: {
      const error = new Error('unknown_action');
      error.status = 400;
      error.code = 'unknown_action';
      throw error;
    }
  }
}

export function isCorporateEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? !BLOCKED_EMAIL_DOMAINS.includes(domain) : false;
}

async function registerCustomer(form, { registered_by, status, templateId = null }) {
  validateCustomerForm(form, { requireDataConsent: registered_by === 'self' });
  const template = await assertAssessmentTemplateExists(templateId);

  const qr_token = randomUUID();
  const customer = await Customer.create({
    ...form,
    data_consent_at: form.data_consent ? (form.data_consent_at || new Date().toISOString()) : null,
    qr_token,
    registered_by,
    language: form.language || 'pt'
  });

  await Assessment.create({
    customer_id: customer.id,
    assessment_template_id: template?.id || null,
    status,
    started_at: status === 'in_progress' ? new Date() : null,
    language: form.language || 'pt'
  });

  return { qr_token };
}

async function adminRegister(form, templateId = null) {
  validateCustomerForm(form);
  const template = await assertAssessmentTemplateExists(templateId);

  const qr_token = randomUUID();
  const customer = await Customer.create({
    ...form,
    data_consent_at: form.data_consent ? (form.data_consent_at || new Date().toISOString()) : null,
    qr_token,
    registered_by: 'admin',
    language: form.language || 'pt'
  });

  await Assessment.create({
    customer_id: customer.id,
    assessment_template_id: template?.id || null,
    status: 'not_started',
    language: form.language || 'pt'
  });

  return { customer: customer.toJSON() };
}

function validateCustomerForm(form = {}, { requireDataConsent = false } = {}) {
  if (!isCorporateEmail(form.email)) {
    const error = new Error('non_corporate_email');
    error.status = 422;
    error.code = 'non_corporate_email';
    throw error;
  }

  if (!form.role || !form.role.trim()) {
    const error = new Error('job_title_required');
    error.status = 422;
    error.code = 'job_title_required';
    throw error;
  }

  if (requireDataConsent && form.data_consent !== true) {
    const error = new Error('data_consent_required');
    error.status = 422;
    error.code = 'data_consent_required';
    throw error;
  }
}

async function loadMainSession(token) {
  const customer = await Customer.findOne({ qr_token: token }).lean();
  if (!customer) {
    const error = new Error('invalid_token');
    error.status = 404;
    error.code = 'invalid_token';
    throw error;
  }

  const allAssessments = await Assessment.find({ customer_id: customer.id }).sort({ created_date: 1 }).lean();
  const mainAssessments = allAssessments.filter(assessment => assessment.assessment_type !== 'sub_assessment');

  let assessment = mainAssessments[0];
  if (!assessment) {
    const createdAssessment = await Assessment.create({
      customer_id: customer.id,
      status: 'in_progress',
      started_at: new Date(),
      language: customer.language || 'pt'
    });
    assessment = createdAssessment.toJSON();
  }

  let existingAnswers = [];
  if (assessment.status !== 'completed') {
    existingAnswers = await AssessmentAnswer.find({ assessment_id: assessment.id }).lean();
  }

  const template = assessment.assessment_template_id
    ? await getAssessmentTemplateById(assessment.assessment_template_id)
    : null;

  return { customer, assessment, existingAnswers, template };
}

async function submitAssessment({ assessmentId, answers = [], globalScore, maturityLevel, pillarScores }) {
  for (const answer of answers) {
    await AssessmentAnswer.updateOne(
      {
        assessment_id: assessmentId,
        question_id: answer.question_id
      },
      {
        $set: {
          ...answer,
          assessment_id: assessmentId
        }
      },
      { upsert: true, runValidators: true }
    );
  }

  const updated = await Assessment.findOneAndUpdate(
    { id: assessmentId },
    {
      status: 'completed',
      completed_at: new Date(),
      global_score: globalScore,
      maturity_level: maturityLevel,
      pillar_scores: JSON.stringify(pillarScores || [])
    },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updated) {
    const error = new Error('not_found');
    error.status = 404;
    error.code = 'not_found';
    throw error;
  }

  return { success: true };
}

async function loadSubSession(assessmentId) {
  const assessment = await Assessment.findOne({ id: assessmentId });
  if (!assessment) {
    const error = new Error('not_found');
    error.status = 404;
    error.code = 'not_found';
    throw error;
  }

  let updatedAssessment = assessment;
  if (assessment.status === 'not_started') {
    updatedAssessment = await Assessment.findOneAndUpdate(
      { id: assessmentId },
      {
        status: 'in_progress',
        started_at: new Date()
      },
      { returnDocument: 'after', runValidators: true }
    );
  }

  const customer = await Customer.findOne({ id: assessment.customer_id }).lean();

  return {
    assessment: updatedAssessment.toJSON(),
    customer: customer || null
  };
}

async function getResult(assessmentId) {
  const assessment = await Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment) {
    const error = new Error('not_found');
    error.status = 404;
    error.code = 'not_found';
    throw error;
  }

  const [customer, answers] = await Promise.all([
    Customer.findOne({ id: assessment.customer_id }).lean(),
    AssessmentAnswer.find({ assessment_id: assessmentId }).lean()
  ]);

  return {
    assessment,
    customer: customer || null,
    answers
  };
}

async function getSubAssessments(assessmentId) {
  const subAssessments = await Assessment.find({ parent_assessment_id: assessmentId }).lean();
  return { subAssessments };
}

async function getSubResult(assessmentId) {
  const assessment = await Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment) {
    const error = new Error('not_found');
    error.status = 404;
    error.code = 'not_found';
    throw error;
  }

  const customer = await Customer.findOne({ id: assessment.customer_id }).lean();

  return {
    assessment,
    customer: customer || null
  };
}
