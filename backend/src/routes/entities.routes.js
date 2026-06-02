import { Router } from 'express';
import {
  bulkCreateEntityRecords,
  createEntityRecord,
  deleteEntityRecord,
  getEntityRecord,
  listEntityRecords,
  updateEntityRecord
} from '../controllers/entities.controller.js';

export const entitiesRouter = Router();

entitiesRouter.get('/:entity', listEntityRecords);
entitiesRouter.post('/:entity', createEntityRecord);
entitiesRouter.post('/:entity/bulk', bulkCreateEntityRecords);
entitiesRouter.get('/:entity/:id', getEntityRecord);
entitiesRouter.put('/:entity/:id', updateEntityRecord);
entitiesRouter.delete('/:entity/:id', deleteEntityRecord);
