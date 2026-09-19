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
import {
  createInputAccessToken,
  createSecret,
  hashSecret,
  INPUT_ACCESS_DURATION_MS,
  isActiveAccess
} from './publicAssessmentAccess.service.js';

const RESULT_ACCESS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

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
    case 'saveDraft':
      return saveDraft(payload);
    case 'loadSub':
      return loadSubSession(payload.assessmentId, payload.accessToken);
    case 'submitSub':
      return submitAssessment(payload);
    case 'getResult':
      return getResult(payload.assessmentId, payload.resultAccess);
    case 'getSubAssessments':
      return getSubAssessments(payload.assessmentId, payload.resultAccess);
    case 'getSubResult':
      return getSubResult(payload.assessmentId, payload.resultAccess);
    case 'exchangeResultAccess':
      return exchangeResultAccess(payload.assessmentId, payload.resultToken);
    case 'issueSubAccess':
      return issueSubAccess(payload.assessmentId, payload.resultAccess);
    case 'renewResultAccess':
      return renewResultAccess(payload.assessmentId, payload.actor);
    case 'renewInputAccess':
      return renewInputAccess(payload.assessmentId, payload.actor);
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

  const assessment = await Assessment.create({
    customer_id: customer.id,
    assessment_template_id: template?.id || null,
    status,
    started_at: status === 'in_progress' ? new Date() : null,
    language: form.language || 'pt'
  });

  const accessToken = await issueInputAccess(assessment.id);
  return {
    qr_token: accessToken,
    assessmentId: assessment.id,
    accessExpiresAt: new Date(Date.now() + INPUT_ACCESS_DURATION_MS)
  };
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

  const assessment = await Assessment.create({
    customer_id: customer.id,
    assessment_template_id: template?.id || null,
    status: 'not_started',
    language: form.language || 'pt'
  });

  return { customer: customer.toJSON(), assessmentId: assessment.id, accessToken: await issueInputAccess(assessment.id) };
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
  let assessment = await Assessment.findOne({ public_access_token_hash: hashSecret(token) }).select('+public_access_token_hash').lean();
  let customer = assessment ? await Customer.findOne({ id: assessment.customer_id }).lean() : null;
  const legacyCustomer = !assessment ? await Customer.findOne({ qr_token: token }).lean() : null;

  if (assessment && !isInputAccessValid(assessment, token)) {
    throwAccessDenied();
  }

  if (!assessment && !legacyCustomer) {
    const error = new Error('invalid_token');
    error.status = 404;
    error.code = 'invalid_token';
    throw error;
  }

  customer = customer || legacyCustomer;
  const allAssessments = await Assessment.find({ customer_id: customer.id }).sort({ created_date: 1 }).lean();
  const mainAssessments = allAssessments.filter(assessment => assessment.assessment_type !== 'sub_assessment');

  assessment = assessment || mainAssessments[0];
  if (!assessment) {
    const createdAssessment = await Assessment.create({
      customer_id: customer.id,
      status: 'in_progress',
      started_at: new Date(),
      language: customer.language || 'pt'
    });
    assessment = createdAssessment.toJSON();
  }

  if (assessment.status === 'completed') {
    const error = new Error('result_access_required');
    error.status = 403;
    error.code = 'result_access_required';
    throw error;
  }

  // `qr_token` is retained only for existing records created before expiring
  // access links. Once a temporary link exists, the legacy permanent token is
  // never accepted again.
  if (legacyCustomer && assessment.public_access_expires_at) throwAccessDenied();

  let accessToken = token;
  if (legacyCustomer || !isInputAccessValid(assessment, token)) {
    accessToken = await issueInputAccess(assessment.id);
  }

  let existingAnswers = [];
  if (assessment.status !== 'completed') {
    existingAnswers = await AssessmentAnswer.find({ assessment_id: assessment.id }).lean();
  }

  const template = assessment.assessment_template_id
    ? await getAssessmentTemplateById(assessment.assessment_template_id)
    : null;

  return { customer, assessment, existingAnswers, template, accessToken };
}

async function submitAssessment({ assessmentId, accessToken, answers = [], globalScore, maturityLevel, pillarScores }) {
  const existingAssessment = await Assessment.findOne({ id: assessmentId }).select('+public_access_token_hash status assessment_type parent_assessment_id').lean();
  if (!existingAssessment) throwNotFound();
  if (!isInputAccessValid(existingAssessment, accessToken)) throwAccessDenied();
  if (existingAssessment.status === 'completed') throwAccessDenied();
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
      pillar_scores: JSON.stringify(pillarScores || []),
      public_access_revoked_at: new Date()
    },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updated) {
    const error = new Error('not_found');
    error.status = 404;
    error.code = 'not_found';
    throw error;
  }

  const result = { success: true, assessmentId, completedNow: true };
  if (existingAssessment.assessment_type !== 'sub_assessment') {
    result.resultToken = await issueResultAccess(assessmentId);
  }
  return result;
}

async function saveDraft({ assessmentId, accessToken, answers = [] }) {
  const assessment = await Assessment.findOne({ id: assessmentId }).select('+public_access_token_hash status').lean();
  if (!assessment || assessment.status === 'completed' || !isInputAccessValid(assessment, accessToken)) throwAccessDenied();
  for (const answer of answers) {
    await AssessmentAnswer.updateOne(
      { assessment_id: assessmentId, question_id: answer.question_id },
      { $set: { ...answer, assessment_id: assessmentId } },
      { upsert: true, runValidators: true }
    );
  }
  return { success: true, saved: answers.length };
}

async function loadSubSession(assessmentId, accessToken) {
  const assessment = await Assessment.findOne({ id: assessmentId }).select('+public_access_token_hash');
  if (!assessment) throwNotFound();
  if (!isInputAccessValid(assessment, accessToken)) throwAccessDenied();

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

  const [customer, existingAnswers] = await Promise.all([
    Customer.findOne({ id: assessment.customer_id }).lean(),
    AssessmentAnswer.find({ assessment_id: assessmentId }).lean()
  ]);

  return {
    assessment: updatedAssessment.toJSON(),
    customer: customer || null,
    existingAnswers
  };
}

async function getResult(assessmentId, resultAccess) {
  await assertResultAccess(assessmentId, resultAccess);
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

async function getSubAssessments(assessmentId, resultAccess) {
  await assertResultAccess(assessmentId, resultAccess);
  const subAssessments = await Assessment.find({ parent_assessment_id: assessmentId }).lean();
  return { subAssessments };
}

async function getSubResult(assessmentId, resultAccess) {
  const assessment = await Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment) throwNotFound();
  await assertResultAccess(assessment.parent_assessment_id || assessmentId, resultAccess);

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

async function exchangeResultAccess(assessmentId, resultToken) {
  const assessment = await Assessment.findOne({ id: assessmentId }).select('+result_exchange_token_hash').lean();
  if (!assessment || assessment.result_exchange_used_at || !isActiveAccess({
    hash: assessment.result_exchange_token_hash,
    expiresAt: assessment.result_exchange_expires_at
  }, resultToken)) throwAccessDenied();

  const sessionToken = createSecret();
  await Assessment.updateOne({ id: assessmentId, result_exchange_used_at: null }, {
    $set: {
      result_exchange_used_at: new Date(),
      result_exchange_token_hash: null,
      result_session_token_hash: hashSecret(sessionToken),
      result_session_expires_at: assessment.result_exchange_expires_at
    }
  });
  return { assessmentId, sessionToken };
}

async function issueSubAccess(assessmentId, resultAccess) {
  const subAssessment = await Assessment.findOne({ id: assessmentId }).lean();
  if (!subAssessment || subAssessment.assessment_type !== 'sub_assessment') throwNotFound();
  await assertResultAccess(subAssessment.parent_assessment_id, resultAccess);
  if (subAssessment.status === 'completed') throwAccessDenied();
  return { assessmentId, accessToken: await issueInputAccess(assessmentId) };
}

async function renewResultAccess(assessmentId, actor) {
  const assessment = await Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment || assessment.assessment_type === 'sub_assessment' || assessment.status !== 'completed') throwNotFound();
  const customer = await Customer.findOne({ id: assessment.customer_id }).lean();
  if (!actor || (actor.role !== 'admin' && (actor.role !== 'account_manager' || !customer || (customer.account_manager_id !== actor.id && customer.created_by_id !== actor.id)))) {
    throwAccessDenied();
  }
  return { assessmentId, resultToken: await issueResultAccess(assessmentId) };
}

async function renewInputAccess(assessmentId, actor) {
  const assessment = await Assessment.findOne({ id: assessmentId }).lean();
  if (!assessment || assessment.assessment_type === 'sub_assessment' || assessment.status === 'completed') throwNotFound();
  const customer = await Customer.findOne({ id: assessment.customer_id }).lean();
  if (!actor || (actor.role !== 'admin' && (actor.role !== 'account_manager' || !customer || (customer.account_manager_id !== actor.id && customer.created_by_id !== actor.id)))) {
    throwAccessDenied();
  }
  const accessToken = await issueInputAccess(assessmentId);
  return {
    assessmentId,
    accessToken,
    accessExpiresAt: new Date(Date.now() + INPUT_ACCESS_DURATION_MS)
  };
}

async function issueResultAccess(assessmentId) {
  const resultToken = createSecret();
  const expiresAt = new Date(Date.now() + RESULT_ACCESS_DURATION_MS);
  await Assessment.updateOne({ id: assessmentId }, {
    $set: {
      result_exchange_token_hash: hashSecret(resultToken),
      result_exchange_expires_at: expiresAt,
      result_exchange_used_at: null,
      result_session_token_hash: null,
      result_session_expires_at: null,
      result_session_revoked_at: null
    }
  });
  return resultToken;
}

export async function issueInputAccess(assessmentId) {
  const expiresAt = new Date(Date.now() + INPUT_ACCESS_DURATION_MS);
  const accessToken = createInputAccessToken(assessmentId, expiresAt);
  await Assessment.updateOne({ id: assessmentId }, {
    $set: {
      public_access_token_hash: hashSecret(accessToken),
      public_access_expires_at: expiresAt,
      public_access_revoked_at: null
    }
  });
  return accessToken;
}

export function getInputAccessLink(assessment) {
  if (!assessment?.id || !assessment.public_access_expires_at || new Date(assessment.public_access_expires_at) <= new Date()) return null;
  return createInputAccessToken(assessment.id, assessment.public_access_expires_at);
}

async function assertResultAccess(assessmentId, resultAccess) {
  if (!resultAccess || resultAccess.assessmentId !== assessmentId) throwAccessDenied();
  const assessment = await Assessment.findOne({ id: assessmentId }).select('+result_session_token_hash').lean();
  if (!assessment || !isActiveAccess({
    hash: assessment.result_session_token_hash,
    expiresAt: assessment.result_session_expires_at,
    revokedAt: assessment.result_session_revoked_at
  }, resultAccess.token)) throwAccessDenied();
}

function isInputAccessValid(assessment, accessToken) {
  return isActiveAccess({
    hash: assessment.public_access_token_hash,
    expiresAt: assessment.public_access_expires_at,
    revokedAt: assessment.public_access_revoked_at
  }, accessToken);
}

function throwAccessDenied() {
  const error = new Error('public_access_denied');
  error.status = 403;
  error.code = 'public_access_denied';
  throw error;
}

function throwNotFound() {
  const error = new Error('not_found');
  error.status = 404;
  error.code = 'not_found';
  throw error;
}
