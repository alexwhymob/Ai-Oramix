import {
  bulkCreateEntities,
  createEntity,
  deleteEntity,
  getEntity,
  listEntities,
  updateEntity
} from '../entities/entityService.js';
import { applyEntityWriteDefaults, buildEntityAccessFilter } from '../entities/entityAccess.js';
import { writeAuditLog } from '../services/auditLog.service.js';

export async function listEntityRecords(req, res, next) {
  try {
    const accessFilter = await buildEntityAccessFilter({ entityName: req.params.entity, action: 'list', user: req.user });
    const records = await listEntities(req.params.entity, req.query, { accessFilter });
    res.json(records);
  } catch (error) {
    next(error);
  }
}

export async function getEntityRecord(req, res, next) {
  try {
    const accessFilter = await buildEntityAccessFilter({ entityName: req.params.entity, action: 'get', user: req.user });
    const record = await getEntity(req.params.entity, req.params.id, { accessFilter });
    res.json(record);
  } catch (error) {
    next(error);
  }
}

export async function createEntityRecord(req, res, next) {
  try {
    await buildEntityAccessFilter({ entityName: req.params.entity, action: 'create', user: req.user });
    const payload = applyEntityWriteDefaults({
      entityName: req.params.entity,
      action: 'create',
      payload: req.body,
      user: req.user
    });
    const record = await createEntity(req.params.entity, payload);
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
    await buildEntityAccessFilter({ entityName: req.params.entity, action: 'bulkCreate', user: req.user });
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
    const accessFilter = await buildEntityAccessFilter({ entityName: req.params.entity, action: 'update', user: req.user });
    const payload = applyEntityWriteDefaults({
      entityName: req.params.entity,
      action: 'update',
      payload: req.body,
      user: req.user
    });
    const record = await updateEntity(req.params.entity, req.params.id, payload, { accessFilter });
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
    const accessFilter = await buildEntityAccessFilter({ entityName: req.params.entity, action: 'delete', user: req.user });
    const result = await deleteEntity(req.params.entity, req.params.id, { accessFilter });
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
