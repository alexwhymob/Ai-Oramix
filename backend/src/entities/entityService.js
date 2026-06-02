import { getEntityModel } from './entityRegistry.js';
import { parseEntityQuery } from './entityQuery.js';

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

  return Model.find(finalFilter).sort(sort).skip(skip).limit(limit).lean();
}

export async function getEntity(entityName, id, options = {}) {
  const Model = resolveEntity(entityName);
  const record = await Model.findOne(mergeFilters({ id }, options.accessFilter)).lean();

  if (!record) {
    const error = new Error(`${entityName} ${id} not found`);
    error.status = 404;
    error.code = 'record_not_found';
    throw error;
  }

  return record;
}

export async function createEntity(entityName, payload) {
  const Model = resolveEntity(entityName);
  const record = await Model.create(payload);
  return record.toJSON();
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
  return records.map(record => record.toJSON());
}

export async function updateEntity(entityName, id, payload, options = {}) {
  const Model = resolveEntity(entityName);
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

  return record.toJSON();
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
