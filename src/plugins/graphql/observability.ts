import { ApolloServerPlugin, GraphQLRequestContext } from "@apollo/server";
import { MetricsService, logger } from "../../observability";

const isProduction = process.env.NODE_ENV === "production";

// Apollo Server plugin for observability
export const observabilityPlugin = (): ApolloServerPlugin => {
  return {
    async requestDidStart(requestContext: GraphQLRequestContext<any>) {
      const startTime = Date.now();
      const operationName = requestContext.request.operationName || "anonymous";
      const operationType = requestContext.operation?.operation || "unknown";

      return {
        async willSendResponse(responseContext: any) {
          const duration = Date.now() - startTime;
          const hasErrors =
            responseContext.errors && responseContext.errors.length > 0;

          // Record metrics (no-op in development)
          MetricsService.recordGraphQLOperation(
            operationType,
            operationName,
            duration,
            hasErrors,
          );

          // Logging
          if (isProduction) {
            logger.info("GraphQL operation completed", {
              operationName,
              operationType,
              duration,
              hasErrors,
            });
          }
          // else {
          //   // Simple development logging
          //   const statusEmoji = hasErrors ? "❌" : "✅";
          //   logger.debug(
          //     `${statusEmoji} GraphQL ${operationType} ${operationName} (${duration}ms)`,
          //   );
          // }
        },

        async didEncounterErrors(errorContext: any) {
          logger.error("GraphQL operation error", {
            operationName,
            operationType,
            errors: errorContext.errors.map((err: Error) => err.message),
          });
        },
      };
    },
  };
};
