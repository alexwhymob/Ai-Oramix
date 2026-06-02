const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export function parseEntityQuery(query = {}) {
  return {
    filter: parseFilter(query.q),
    limit: parseLimit(query.limit),
    skip: parseSkip(query.skip),
    sort: parseSort(query.sort_by)
  };
}

function parseFilter(rawFilter) {
  if (!rawFilter) return {};

  if (typeof rawFilter === 'object') {
    return sanitizeFilter(rawFilter);
  }

  try {
    const parsed = JSON.parse(rawFilter);
    return sanitizeFilter(parsed);
  } catch {
    const error = new Error('Invalid q parameter. Expected JSON object.');
    error.status = 400;
    error.code = 'invalid_query';
    throw error;
  }
}

function sanitizeFilter(filter) {
  if (!filter || Array.isArray(filter) || typeof filter !== 'object') {
    const error = new Error('Invalid q parameter. Expected JSON object.');
    error.status = 400;
    error.code = 'invalid_query';
    throw error;
  }

  return Object.fromEntries(
    Object.entries(filter).filter(([key]) => !key.startsWith('$') && !key.includes('.'))
  );
}

function parseLimit(rawLimit) {
  if (!rawLimit) return DEFAULT_LIMIT;

  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1) {
    const error = new Error('Invalid limit parameter.');
    error.status = 400;
    error.code = 'invalid_limit';
    throw error;
  }

  return Math.min(limit, MAX_LIMIT);
}

function parseSkip(rawSkip) {
  if (!rawSkip) return 0;

  const skip = Number(rawSkip);
  if (!Number.isInteger(skip) || skip < 0) {
    const error = new Error('Invalid skip parameter.');
    error.status = 400;
    error.code = 'invalid_skip';
    throw error;
  }

  return skip;
}

function parseSort(rawSort) {
  if (!rawSort) return {};

  const field = String(rawSort);
  const direction = field.startsWith('-') ? -1 : 1;
  const fieldName = field.replace(/^-/, '');

  if (!fieldName || fieldName.startsWith('$') || fieldName.includes('.')) {
    const error = new Error('Invalid sort_by parameter.');
    error.status = 400;
    error.code = 'invalid_sort';
    throw error;
  }

  return { [fieldName]: direction };
}
