/**
 * An expected, client-facing error. The error handler turns it into:
 *   { success: false, error: { code, message, details? } }
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static validation(details, message = 'Invalid request data') {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(409, 'CONFLICT', message);
  }
}
