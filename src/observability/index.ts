export { default as logger, createLogger } from "./logger";
export { tracer, TracerService } from "./tracer";
export { MetricsService } from "./metrics";

// Re-export commonly used OpenTelemetry types
export { Span, SpanStatusCode, trace, context } from "@opentelemetry/api";
