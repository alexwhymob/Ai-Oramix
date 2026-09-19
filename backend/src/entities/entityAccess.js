import { Assessment, Customer } from '../models/index.js';
import { getEntityModel } from './entityRegistry.js';

const PUBLIC_READ_ENTITIES = new Set(['Pillar', 'Question', 'AssessmentTemplate', 'MaturityPreset', 'MaturityLevel']);
const ADMIN_ONLY_ENTITIES = new Set([
  'User',
  'PresentationTemplate',
  'ReportTemplate',
  'ReportSection',
  'NotificationTemplate',
  'MaturityPreset',
  'MaturityLevel',
  'HtmlReportConfig',
  'LlmAuditLog'
]);

export async function buildEntityAccessFilter({ entityName, action, user }) {
  assertKnownEntity(entityName);

  if (PUBLIC_READ_ENTITIES.has(entityName) && isReadAction(action)) {
    return {};
  }

  requireAuthenticated(user);

  if (user.role === 'admin') {
    return {};
  }

  if (ADMIN_ONLY_ENTITIES.has(entityName)) {
    throwForbidden();
  }

  if (PUBLIC_READ_ENTITIES.has(entityName)) {
    throwForbidden();
  }

  if (user.role === 'ai_consultant') {
    return buildAiConsultantFilter({ entityName, action });
  }

  if (user.role === 'account_manager') {
    return buildAccountManagerFilter({ entityName, action, user });
  }

  throwForbidden();
}

export function applyEntityWriteDefaults({ entityName, action, payload, user }) {
  if (entityName === 'User') {
    return sanitizeUserWritePayload(action, payload);
  }

  if (entityName !== 'Customer' || action !== 'create' || user?.role !== 'account_manager') {
    return payload;
  }

  return {
    ...payload,
    account_manager_id: user.id,
    created_by_id: user.id
  };
}

const USER_WRITE_FIELDS = new Set(['email', 'full_name', 'role', 'active', 'booking_url']);

function sanitizeUserWritePayload(action, payload = {}) {
  if (action === 'create' || action === 'bulkCreate') {
    const error = new Error('User records must be created through the invite flow.');
    error.status = 403;
    error.code = 'user_write_flow_required';
    throw error;
  }

  const forbiddenFields = Object.keys(payload).filter((field) => !USER_WRITE_FIELDS.has(field));
  if (forbiddenFields.length) {
    const error = new Error('User security fields cannot be changed through the generic entity API.');
    error.status = 400;
    error.code = 'user_field_not_editable';
    throw error;
  }

  return Object.fromEntries(Object.entries(payload).filter(([field]) => USER_WRITE_FIELDS.has(field)));
}

export function assertFunctionAccess({ functionName, action, user }) {
  if (functionName === 'deleteCustomerCascade') {
    requireAuthenticated(user);
    if (user.role !== 'admin') throwForbidden();
    return;
  }

  if (functionName === 'quizSession' && ['adminRegister', 'renewResultAccess', 'renewInputAccess'].includes(action)) {
    requireAuthenticated(user);
    if (!['admin', 'account_manager'].includes(user.role)) {
      throwForbidden();
    }
  }
}

export function applyFunctionWriteDefaults({ functionName, payload, user }) {
  if (functionName !== 'quizSession' || payload?.action !== 'adminRegister' || user?.role !== 'account_manager') {
    return payload;
  }

  return {
    ...payload,
    form: {
      ...(payload.form || {}),
      account_manager_id: user.id,
      created_by_id: user.id
    }
  };
}

function buildAiConsultantFilter({ entityName, action }) {
  if (entityName === 'Customer' && !isReadAction(action)) {
    throwForbidden();
  }

  if (entityName === 'AssessmentAnswer' && !isReadAction(action)) {
    throwForbidden();
  }

  return {};
}

async function buildAccountManagerFilter({ entityName, action, user }) {
  switch (entityName) {
    case 'Customer':
      return buildOwnedCustomerFilter({ user, action });
    case 'Assessment':
      return { customer_id: { $in: await getOwnedCustomerIds(user) } };
    case 'AssessmentAnswer':
      if (!isReadAction(action)) throwForbidden();
      return { assessment_id: { $in: await getOwnedAssessmentIds(user) } };
    case 'Report':
    case 'ConsultantNote':
      if (!isReadAction(action)) throwForbidden();
      return { assessment_id: { $in: await getOwnedAssessmentIds(user) } };
    default:
      throwForbidden();
  }
}

function buildOwnedCustomerFilter({ user, action }) {
  if (action === 'create') {
    return {};
  }

  if (action === 'delete' || action === 'bulkCreate') {
    throwForbidden();
  }

  return {
    $or: [
      { account_manager_id: user.id },
      { created_by_id: user.id }
    ]
  };
}

async function getOwnedCustomerIds(user) {
  const customers = await Customer.find(buildOwnedCustomerFilter({ user, action: 'list' })).select('id').lean();
  return customers.map(customer => customer.id);
}

async function getOwnedAssessmentIds(user) {
  const customerIds = await getOwnedCustomerIds(user);
  const assessments = await Assessment.find({ customer_id: { $in: customerIds } }).select('id').lean();
  return assessments.map(assessment => assessment.id);
}

function isReadAction(action) {
  return action === 'list' || action === 'get';
}

function assertKnownEntity(entityName) {
  if (getEntityModel(entityName)) {
    return;
  }

  const error = new Error(`Entity ${entityName} not found`);
  error.status = 404;
  error.code = 'entity_not_found';
  throw error;
}

function requireAuthenticated(user) {
  if (user) return;

  const error = new Error('Authentication required');
  error.status = 401;
  error.code = 'auth_required';
  throw error;
}

function throwForbidden() {
  const error = new Error('Forbidden');
  error.status = 403;
  error.code = 'forbidden';
  throw error;
}
