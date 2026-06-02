import {
  bulkCreateEntities,
  createEntity,
  deleteEntity,
  getEntity,
  listEntities,
  updateEntity
} from '../entities/entityService.js';
import { writeAuditLog } from '../services/auditLog.service.js';

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
    await writeAuditLog({
      req,
      action: 'entity.create',
      entity: req.params.entity,
      entity_id: record.id
    });
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
}

export async function bulkCreateEntityRecords(req, res, next) {
  try {
    const records = await bulkCreateEntities(req.params.entity, req.body);
    await writeAuditLog({
      req,
      action: 'entity.bulk_create',
      entity: req.params.entity,
      metadata: { count: records.length }
    });
    res.status(201).json(records);
  } catch (error) {
    next(error);
  }
}

export async function updateEntityRecord(req, res, next) {
  try {
    const record = await updateEntity(req.params.entity, req.params.id, req.body);
    await writeAuditLog({
      req,
      action: 'entity.update',
      entity: req.params.entity,
      entity_id: req.params.id
    });
    res.json(record);
  } catch (error) {
    next(error);
  }
}

export async function deleteEntityRecord(req, res, next) {
  try {
    const result = await deleteEntity(req.params.entity, req.params.id);
    await writeAuditLog({
      req,
      action: 'entity.delete',
      entity: req.params.entity,
      entity_id: req.params.id
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
