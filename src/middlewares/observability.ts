import { Request, Response, NextFunction } from "express";
import { MetricsService, logger } from "../observability";

const isProduction = process.env.NODE_ENV === "production";

// Middleware to track HTTP metrics and logging
export const handleObservabilityMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const route = req.route?.path || req.path;

    // Record metrics (no-op in development)
    MetricsService.recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      duration,
    );

    // Logging
    if (isProduction) {
      logger.info("Request completed", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
    }
    // else {
    //   // Simple development logging
    //   const statusEmoji = res.statusCode >= 400 ? "❌" : "✅";
    //   logger.debug(
    //     `${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    //   );
    // }
  });

  next();
};
