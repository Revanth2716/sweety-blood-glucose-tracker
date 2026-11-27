import jwt from 'jsonwebtoken';

/**
 * Create a signed access token for a user.
 *
 * @param {{ id: string, email: string }} user
 * @param {{ jwtSecret: string, jwtExpiresIn: string }} config
 * @returns {string}
 */
export function signToken(user, config) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Verify a signed access token.
 *
 * @param {string} token
 * @param {{ jwtSecret: string }} config
 * @returns {{ sub: string, email: string, iat: number, exp: number }}
 */
export function verifyToken(token, config) {
  return jwt.verify(token, config.jwtSecret);
}
