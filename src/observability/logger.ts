import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");
const serviceName = process.env.OTEL_SERVICE_NAME || "kuckoo-server";

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
  ),
  defaultMeta: {
    service: serviceName,
  },
  transports: isProduction
    ? [
        // Production: JSON logs to console and files
        new winston.transports.Console({
          format: winston.format.json(),
        }),
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
          format: winston.format.json(),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: "logs/combined.log",
          format: winston.format.json(),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ]
    : [
        // Development: Clean, colorized console output only
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              // Remove service from meta display
              const { service, ...displayMeta } = meta;
              const metaStr =
                Object.keys(displayMeta).length > 0
                  ? "\n  " +
                    JSON.stringify(displayMeta, null, 2)
                      .split("\n")
                      .join("\n  ")
                  : "";
              return `${timestamp} ${level}: ${message}${metaStr}`;
            }),
          ),
        }),
      ],
});

// Create a child logger with additional context
export const createLogger = (context: Record<string, any> = {}) => {
  return logger.child(context);
};

export default logger;
