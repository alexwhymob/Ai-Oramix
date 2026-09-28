import { getEntityModel } from './entityRegistry.js';
import { withSpan } from '../telemetry/tracing.js';
import { parseEntityQuery } from './entityQuery.js';
import { syncAssessmentTemplatePillarCount } from '../services/assessmentTemplate.service.js';

export function resolveEntity(entityName) {
  const Model = getEntityModel(entityName);

  if (!Model) {
    const error = new Error(`Entity ${entityName} not found`);
    error.status = 404;
    error.code = 'entity_not_found';
    throw error;
  }

  return Model;
}

export async function listEntities(entityName, query, options = {}) {
  const Model = resolveEntity(entityName);
  const { filter, limit, skip, sort } = parseEntityQuery(query);
  const finalFilter = mergeFilters(filter, options.accessFilter);

  const records = await withSpan('MongoDB find', {
    'db.operation.name': 'find',
    'db.collection.name': entityName,
    'app.operation': 'entities.list'
  }, () => Model.find(finalFilter).sort(sort).skip(skip).limit(limit).lean());
  return records.map((record) => sanitizeEntityRecord(entityName, record));
}

export async function getEntity(entityName, id, options = {}) {
  const Model = resolveEntity(entityName);
  const record = await withSpan('MongoDB findOne', {
    'db.operation.name': 'findOne',
    'db.collection.name': entityName,
    'app.operation': 'entities.get'
  }, () => Model.findOne(mergeFilters({ id }, options.accessFilter)).lean());

  if (!record) {
    const error = new Error(`${entityName} ${id} not found`);
    error.status = 404;
    error.code = 'record_not_found';
    throw error;
  }

  return sanitizeEntityRecord(entityName, record);
}

export async function createEntity(entityName, payload) {
  const Model = resolveEntity(entityName);
  const record = await Model.create(payload);
  await syncEntitySideEffects(entityName, null, record.toJSON());
  return sanitizeEntityRecord(entityName, record.toJSON());
}

export async function bulkCreateEntities(entityName, payload) {
  if (!Array.isArray(payload)) {
    const error = new Error('Bulk payload must be an array.');
    error.status = 400;
    error.code = 'invalid_bulk_payload';
    throw error;
  }

  const Model = resolveEntity(entityName);
  const records = await Model.insertMany(payload, { ordered: false });
  return records.map(record => sanitizeEntityRecord(entityName, record.toJSON()));
}

export async function updateEntity(entityName, id, payload, options = {}) {
  const Model = resolveEntity(entityName);
  const previousRecord = entityName === 'Pillar'
    ? await Model.findOne(mergeFilters({ id }, options.accessFilter)).lean()
    : null;
  const record = await Model.findOneAndUpdate(
    mergeFilters({ id }, options.accessFilter),
    payload,
    { returnDocument: 'after', runValidators: true }
  );

  if (!record) {
    const error = new Error(`${entityName} ${id} not found`);
    error.status = 404;
    error.code = 'record_not_found';
    throw error;
  }

  await syncEntitySideEffects(entityName, previousRecord, record.toJSON());
  return sanitizeEntityRecord(entityName, record.toJSON());
}

export async function deleteEntity(entityName, id, options = {}) {
  const Model = resolveEntity(entityName);
  const record = await Model.findOneAndDelete(mergeFilters({ id }, options.accessFilter)).lean();

  if (!record) {
    const error = new Error(`${entityName} ${id} not found`);
    error.status = 404;
    error.code = 'record_not_found';
    throw error;
  }

  await syncEntitySideEffects(entityName, record, null);
  return { success: true };
}

function mergeFilters(filter, accessFilter = {}) {
  const normalizedAccessFilter = accessFilter || {};
  if (Object.keys(normalizedAccessFilter).length === 0) {
    return filter;
  }

  if (Object.keys(filter).length === 0) {
    return normalizedAccessFilter;
  }

  return {
    $and: [
      filter,
      normalizedAccessFilter
    ]
  };
}

function sanitizeEntityRecord(entityName, record) {
  if (entityName === 'Customer') {
    const sanitized = { ...record };
    delete sanitized.qr_token;
    return sanitized;
  }

  if (entityName !== 'User') return record;

  const sanitized = { ...record };
  delete sanitized.password_hash;
  delete sanitized.reset_password_token_hash;
  delete sanitized.reset_password_expires_at;
  delete sanitized.refresh_token_hash;
  delete sanitized.refresh_token_expires_at;
  delete sanitized.auth_token_version;
  delete sanitized.mfa_secret_encrypted;
  delete sanitized.mfa_recovery_codes_hash;
  return sanitized;
}

async function syncEntitySideEffects(entityName, previousRecord, nextRecord) {
  if (entityName !== 'Pillar') {
    return;
  }

  const templateIds = new Set([
    previousRecord?.assessment_template_id,
    nextRecord?.assessment_template_id
  ].filter(Boolean));

  await Promise.all(
    [...templateIds].map(templateId => syncAssessmentTemplatePillarCount(templateId))
  );
}
