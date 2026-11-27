/**
 * Application error carrying an HTTP status code, a stable machine readable code and an
 * optional field name so the UI can place the message next to the right input.
 */
export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {string} [code]
   * @param {string} [field]
   */
  constructor(status, message, code = 'ERROR', field) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (field) {
      this.field = field;
    }
  }
}

/**
 * @param {string} message
 * @param {string} [field]
 * @param {string} [code]
 * @returns {ApiError}
 */
export function badRequest(message, field, code = 'BAD_REQUEST') {
  return new ApiError(400, message, code, field);
}

/**
 * @param {string} [message]
 * @param {string} [code]
 * @returns {ApiError}
 */
export function unauthorized(message = 'Authentication required.', code = 'UNAUTHORIZED') {
  return new ApiError(401, message, code);
}

/**
 * @param {string} [message]
 * @param {string} [code]
 * @returns {ApiError}
 */
export function forbidden(message = 'You are not allowed to do that.', code = 'FORBIDDEN') {
  return new ApiError(403, message, code);
}

/**
 * @param {string} [message]
 * @param {string} [code]
 * @returns {ApiError}
 */
export function notFound(message = 'Not found.', code = 'NOT_FOUND') {
  return new ApiError(404, message, code);
}

/**
 * @param {string} message
 * @param {string} [field]
 * @param {string} [code]
 * @returns {ApiError}
 */
export function conflict(message, field, code = 'CONFLICT') {
  return new ApiError(409, message, code, field);
}
