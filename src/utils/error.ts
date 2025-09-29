import { GraphQLFormattedError } from "graphql";

export const ERROR_CODES = {
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
};

export const ERROR_MESSAGES = {
  AUTHENTICATION_ERROR:
    "You are not authenticated. Please sign in to continue.",
  AUTHORIZATION_ERROR: "You are not authorized to perform this action.",
  VALIDATION_ERROR: "The provided data is invalid. Please check your input.",
  NOT_FOUND_ERROR: "The requested resource was not found.",
  INTERNAL_SERVER_ERROR: "Something went wrong, Please try again later.",
};

export class AppError extends Error {
  extensions: { [key: string]: any };

  constructor(
    message: string,
    statusCode: number,
    errCode: string,
    additionalData?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.extensions = {
      code: errCode,
      statusCode: statusCode,
      ...additionalData,
    };

    if (Error.captureStackTrace)
      Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = ERROR_MESSAGES.AUTHENTICATION_ERROR) {
    super(message, 401, ERROR_CODES.AUTHENTICATION_ERROR);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = ERROR_MESSAGES.AUTHORIZATION_ERROR) {
    super(message, 403, ERROR_CODES.AUTHORIZATION_ERROR);
  }
}

export class ValidationError extends AppError {
  constructor(message = ERROR_MESSAGES.VALIDATION_ERROR, field?: string) {
    super(message, 400, ERROR_CODES.VALIDATION_ERROR, { field });
  }
}

export class NotFoundError extends AppError {
  constructor(message = ERROR_MESSAGES.NOT_FOUND_ERROR, resource?: string) {
    super(message, 404, ERROR_CODES.NOT_FOUND_ERROR, { resource });
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    originalError?: Error
  ) {
    super(message, 500, ERROR_CODES.INTERNAL_SERVER_ERROR, {
      ...(process.env.NODE_ENV === "development" &&
        originalError && {
          originalErrorMessage: originalError.message,
          originalErrorStack: originalError.stack,
        }),
    });
  }
}

// ----------------------------------------------------------------------------------------------------------

// Utility function to check if error is a AppError
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

// Helper to convert unknown errors to your error system
export function toAppError(error: unknown): AppError {
  // Already our error type
  if (isAppError(error)) return error;

  // Standard Error object
  if (error instanceof Error)
    return new InternalServerError(ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error);

  // String error
  if (typeof error === "string")
    return new InternalServerError(
      process.env.NODE_ENV === "development"
        ? error
        : ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );

  // Unknown error type
  return new InternalServerError();
}

// ----------------------------------------------------------------------------------------------------------

export const graphqlErrorFormatter = (error: GraphQLFormattedError) => {
  // Log the full error in development
  if (process.env.NODE_ENV === "development") {
    console.error("GraphQL Error:", error);
  }

  // Building error data
  const baseExtensions = {
    code: error.extensions?.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
    statusCode: error.extensions?.statusCode || 500,
  };
  const devlopementErrorMetaData =
    process.env.NODE_ENV === "development"
      ? {
          locations: error.locations,
          path: error.path,
        }
      : {};
  const developmentErrorExtensions =
    process.env.NODE_ENV === "development"
      ? {
          originalErrorMessage: error.extensions?.originalErrorMessage,
          originalErrorStack: error.extensions?.originalErrorStack,
          stacktrace: error.extensions?.stacktrace,
        }
      : {};

  // Extract additional error-specific data (field, resource, etc.)
  const additionalData: Record<string, any> = {};
  if (error.extensions) {
    const excludedKeys = [
      "code",
      "statusCode",
      "stacktrace",
      "originalErrorMessage",
      "originalErrorStack",
    ];
    Object.keys(error.extensions).forEach((key) => {
      if (!excludedKeys.includes(key)) {
        additionalData[key] = error.extensions![key];
      }
    });
  }

  // Final formatted error
  return {
    message: error.message,
    ...devlopementErrorMetaData,
    extensions: {
      ...baseExtensions,
      ...additionalData,
      ...developmentErrorExtensions,
    },
  };
};
