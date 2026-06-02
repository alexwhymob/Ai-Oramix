export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;

  res.status(status).json({
    error: err.code || 'internal_error',
    message: err.message || 'Internal server error'
  });
}
