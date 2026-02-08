import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";

class OpenTelemetryService {
  private sdk: NodeSDK;
  private isInitialized: boolean = false;

  constructor() {
    // Configure exporters
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    });

    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    });

    const logExporter = new OTLPLogExporter({
      url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
    });

    // Initialize SDK
    this.sdk = new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60000,
      }),
      logRecordProcessor: new BatchLogRecordProcessor(logExporter),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": {
            enabled: false,
          },
          "@opentelemetry/instrumentation-http": {
            enabled: true,
          },
          "@opentelemetry/instrumentation-express": {
            enabled: true,
          },
          "@opentelemetry/instrumentation-graphql": {
            enabled: true,
          },
        }),
        new WinstonInstrumentation(),
      ],
    });
  }

  //Start OpenTelemetry SDK
  public start(): void {
    if (this.isInitialized) {
      console.warn("OpenTelemetry SDK is already initialized");
      return;
    }

    this.sdk.start();
    this.isInitialized = true;
    console.log("OpenTelemetry SDK started successfully");

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  // Setup graceful shutdown handlers
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
    process.on("SIGINT", () => shutdownHandler("SIGINT"));
  }

  // Shutdown OpenTelemetry SDK
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.sdk.shutdown();
      console.log("OpenTelemetry SDK shut down successfully");
    } catch (error) {
      console.error("Error shutting down OpenTelemetry SDK", error);
    }
  }
}

const openTelemetryService = new OpenTelemetryService();
openTelemetryService.start();
