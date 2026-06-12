import { apiRequest } from './apiClient';

const ENTITY_NAMES = [
  'Customer',
  'Assessment',
  'AssessmentTemplate',
  'AssessmentAnswer',
  'PresentationTemplate',
  'Pillar',
  'Question',
  'Report',
  'ConsultantNote',
  'User'
];

export function createEntitiesClient() {
  return Object.fromEntries(
    ENTITY_NAMES.map(entityName => [entityName, createEntityClient(entityName)])
  );
}

function createEntityClient(entityName) {
  return {
    list: (sortBy, limit) => listEntity(entityName, { sortBy, limit }),
    filter: (query, sortBy, limit) => listEntity(entityName, { query, sortBy, limit }),
    get: (id) => apiRequest(`/entities/${entityName}/${encodeURIComponent(id)}`),
    create: (data) => apiRequest(`/entities/${entityName}`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    bulkCreate: (records) => apiRequest(`/entities/${entityName}/bulk`, {
      method: 'POST',
      body: JSON.stringify(records)
    }),
    update: (id, data) => apiRequest(`/entities/${entityName}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (id) => apiRequest(`/entities/${entityName}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  };
}

function listEntity(entityName, { query, sortBy, limit } = {}) {
  const searchParams = new URLSearchParams();

  if (query && Object.keys(query).length > 0) {
    searchParams.set('q', JSON.stringify(query));
  }
  if (sortBy) {
    searchParams.set('sort_by', sortBy);
  }
  if (limit) {
    searchParams.set('limit', String(limit));
  }

  const queryString = searchParams.toString();
  return apiRequest(`/entities/${entityName}${queryString ? `?${queryString}` : ''}`);
}
