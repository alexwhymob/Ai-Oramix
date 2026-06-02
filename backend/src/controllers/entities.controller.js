import {
  bulkCreateEntities,
  createEntity,
  deleteEntity,
  getEntity,
  listEntities,
  updateEntity
} from '../entities/entityService.js';

export async function listEntityRecords(req, res, next) {
  try {
    const records = await listEntities(req.params.entity, req.query);
    res.json(records);
  } catch (error) {
    next(error);
  }
}

export async function getEntityRecord(req, res, next) {
  try {
    const record = await getEntity(req.params.entity, req.params.id);
    res.json(record);
  } catch (error) {
    next(error);
  }
}

export async function createEntityRecord(req, res, next) {
  try {
    const record = await createEntity(req.params.entity, req.body);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
}

export async function bulkCreateEntityRecords(req, res, next) {
  try {
    const records = await bulkCreateEntities(req.params.entity, req.body);
    res.status(201).json(records);
  } catch (error) {
    next(error);
  }
}

export async function updateEntityRecord(req, res, next) {
  try {
    const record = await updateEntity(req.params.entity, req.params.id, req.body);
    res.json(record);
  } catch (error) {
    next(error);
  }
}

export async function deleteEntityRecord(req, res, next) {
  try {
    const result = await deleteEntity(req.params.entity, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
