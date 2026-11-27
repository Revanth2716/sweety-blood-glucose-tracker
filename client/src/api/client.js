const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

/**
 * An error thrown by the API. It carries the message the server sent, so the UI can show it
 * to the user exactly as it was written.
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {string} [code]
   * @param {string} [field]
   */
  constructor(message, status, code, field) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

/**
 * Call the Sweety API.
 *
 * @param {string} path e.g. '/readings'
 * @param {{ method?: string, body?: unknown, token?: string | null }} [options]
 * @returns {Promise<any>}
 */
export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new ApiError(
      error.message ?? 'Something went wrong. Please try again.',
      response.status,
      error.code,
      error.field,
    );
  }

  return payload;
}

/**
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export { API_BASE_URL };
