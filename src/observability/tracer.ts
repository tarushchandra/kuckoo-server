const isProduction = process.env.NODE_ENV === "production";

// Conditional import
let trace: any;
let Span: any;
let SpanStatusCode: any;
let context: any;

if (isProduction) {
  const otelApi = require("@opentelemetry/api");
  trace = otelApi.trace;
  Span = otelApi.Span;
  SpanStatusCode = otelApi.SpanStatusCode;
  context = otelApi.context;
}

// Get the tracer instance (only in production)
export const tracer = isProduction
  ? trace.getTracer("kuckoo-server-tracer", "1.0.0")
  : null;

// Utility class for common tracing operations
export class TracerService {
  // Execute function with span (production) or without (development)
  static async executeInSpan<T>(
    spanName: string,
    fn: (span: any) => Promise<T>,
    attributes?: Record<string, any>,
  ): Promise<T> {
    // Development: Just execute the function
    if (!isProduction) return await fn(null);

    // Production: Full tracing
    const span = tracer.startSpan(spanName);

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        async () => await fn(span),
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  // Add event to current span (production only)
  static addEvent(name: string, attributes?: Record<string, any>): void {
    if (!isProduction) return;

    const span = trace.getSpan(context.active());
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  // Set attribute on current span (production only)
  static setAttribute(key: string, value: any): void {
    if (!isProduction) return;

    const span = trace.getSpan(context.active());
    if (span) {
      span.setAttribute(key, value);
    }
  }

  // Get current span (production only)
  static getCurrentSpan(): any {
    if (!isProduction) return null;
    return trace.getSpan(context.active());
  }
}

// Export types conditionally
export { Span, SpanStatusCode, trace, context };
