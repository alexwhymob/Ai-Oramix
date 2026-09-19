import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';
import { env } from '../config/env.js';

let telemetrySdk;

if (env.OTEL_ENABLED) {
  const configuration = {
    serviceName: env.OTEL_SERVICE_NAME,
    metricReaders: [new PrometheusExporter({
      host: '0.0.0.0',
      port: env.OTEL_PROMETHEUS_PORT,
      endpoint: '/metrics',
      withoutScopeInfo: true
    })],
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new MongooseInstrumentation()
    ]
  };

  if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    configuration.traceExporter = new OTLPTraceExporter({
      url: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
    });
  } else {
    // NodeSDK otherwise defaults to an OTLP exporter at localhost:4318.
    // Keep tracing idle until a collector is explicitly configured.
    configuration.spanProcessors = [];
  }

  telemetrySdk = new NodeSDK(configuration);
  telemetrySdk.start();
  console.log(`OpenTelemetry enabled: metrics available on port ${env.OTEL_PROMETHEUS_PORT}`);
}

export async function shutdownTelemetry() {
  if (telemetrySdk) await telemetrySdk.shutdown();
}
