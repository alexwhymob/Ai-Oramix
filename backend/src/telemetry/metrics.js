import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('oramix.http');
const requestCounter = meter.createCounter('oramix_http_server_requests_total', {
  description: 'Total HTTP requests processed by the API'
});
const requestDuration = meter.createHistogram('oramix_http_server_request_duration_ms', {
  description: 'Duration of HTTP requests processed by the API',
  unit: 'ms'
});
const activeRequests = meter.createUpDownCounter('oramix_http_server_active_requests', {
  description: 'HTTP requests currently being processed'
});

function routeName(req) {
  const route = req.route?.path;
  if (typeof route === 'string') return `${req.baseUrl || ''}${route}`;
  return req.baseUrl || 'unmatched';
}

export function httpMetricsMiddleware(req, res, next) {
  const startedAt = performance.now();
  const method = req.method;
  activeRequests.add(1, { 'http.request.method': method });

  res.on('finish', () => {
    const attributes = {
      'http.request.method': method,
      'http.response.status_code': res.statusCode,
      'http.route': routeName(req)
    };
    activeRequests.add(-1, { 'http.request.method': method });
    requestCounter.add(1, attributes);
    requestDuration.record(performance.now() - startedAt, attributes);
  });

  next();
}
