import { SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('oramix.business');

// Attributes are deliberately allow-listed at each call site. Do not attach
// e-mails, tokens, free text, answer values, full URLs or request bodies.
export async function withSpan(name, attributes, operation) {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await operation();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error?.code || error?.name || 'error' });
      throw error;
    } finally {
      span.end();
    }
  });
}
