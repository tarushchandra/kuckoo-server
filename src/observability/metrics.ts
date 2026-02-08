const isProduction = process.env.NODE_ENV === "production";

// Conditional import
let metrics: any;

if (isProduction) {
  const otelApi = require("@opentelemetry/api");
  metrics = otelApi.metrics;
}

const meter = isProduction
  ? metrics.getMeter("kuckoo-server-meter", "1.0.0")
  : null;

// Create a no-op counter for development
const createNoopCounter = () => ({
  add: () => {},
});

// Create a no-op histogram for development
const createNoopHistogram = () => ({
  record: () => {},
});

export class MetricsService {
  // HTTP Metrics
  public static readonly httpRequestsTotal = isProduction
    ? meter.createCounter("http_requests_total", {
        description: "Total number of HTTP requests",
        unit: "1",
      })
    : createNoopCounter();

  public static readonly httpRequestDuration = isProduction
    ? meter.createHistogram("http_request_duration_ms", {
        description: "Duration of HTTP requests in milliseconds",
        unit: "ms",
      })
    : createNoopHistogram();

  // GraphQL Metrics
  public static readonly graphqlOperationsTotal = isProduction
    ? meter.createCounter("graphql_operations_total", {
        description: "Total number of GraphQL operations",
        unit: "1",
      })
    : createNoopCounter();

  public static readonly graphqlOperationDuration = isProduction
    ? meter.createHistogram("graphql_operation_duration_ms", {
        description: "Duration of GraphQL operations in milliseconds",
        unit: "ms",
      })
    : createNoopHistogram();

  public static readonly graphqlErrors = isProduction
    ? meter.createCounter("graphql_errors_total", {
        description: "Total number of GraphQL errors",
        unit: "1",
      })
    : createNoopCounter();

  // Database Metrics
  public static readonly dbQueriesTotal = isProduction
    ? meter.createCounter("db_queries_total", {
        description: "Total number of database queries",
        unit: "1",
      })
    : createNoopCounter();

  public static readonly dbQueryDuration = isProduction
    ? meter.createHistogram("db_query_duration_ms", {
        description: "Duration of database queries in milliseconds",
        unit: "ms",
      })
    : createNoopHistogram();

  // Record HTTP request (no-op in development)
  public static recordHttpRequest(
    method: string,
    route: string,
    status: number,
    duration: number,
  ): void {
    this.httpRequestsTotal.add(1, { method, route, status });
    this.httpRequestDuration.record(duration, { method, route, status });
  }

  // Record GraphQL operation (no-op in development)
  public static recordGraphQLOperation(
    operationType: string,
    operationName: string,
    duration: number,
    hasError: boolean = false,
  ): void {
    this.graphqlOperationsTotal.add(1, {
      type: operationType,
      operation: operationName,
    });
    this.graphqlOperationDuration.record(duration, {
      type: operationType,
      operation: operationName,
    });

    if (hasError) {
      this.graphqlErrors.add(1, {
        type: operationType,
        operation: operationName,
      });
    }
  }

  // Record database query (no-op in development)
  public static recordDbQuery(
    operation: string,
    table: string,
    duration: number,
  ): void {
    this.dbQueriesTotal.add(1, { operation, table });
    this.dbQueryDuration.record(duration, { operation, table });
  }
}
