export const ERROR_CODES = {
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
};

export const ERROR_MESSAGES = {
  AUTHENTICATION_ERROR:
    "You are not authenticated. Please sign in to continue.",
  AUTHORIZATION_ERROR: "You are not authorized to perform this action.",
  INTERNAL_SERVER_ERROR: "Something went wrong, Please try again later.",
};

export class BackendAppError extends Error {
  extensions: { [key: string]: any };

  constructor(message: string, statusCode: number, errCode: string) {
    super(message);
    this.extensions = {
      code: errCode,
      statusCode: statusCode,
    };

    if (Error.captureStackTrace)
      Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends BackendAppError {
  constructor(message = ERROR_MESSAGES.AUTHENTICATION_ERROR) {
    super(message, 401, ERROR_CODES.AUTHENTICATION_ERROR);
  }
}

export class AuthorizationError extends BackendAppError {
  constructor(message = ERROR_MESSAGES.AUTHORIZATION_ERROR) {
    super(message, 403, ERROR_CODES.AUTHORIZATION_ERROR);
  }
}

// Utility function to check if error is a BackendAppError
export function isBackendAppError(error: any): error is BackendAppError {
  return error instanceof BackendAppError;
}
