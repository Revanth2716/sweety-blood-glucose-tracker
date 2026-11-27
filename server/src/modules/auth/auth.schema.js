import { z } from 'zod';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} value
 * @returns {boolean}
 */
function looksLikeEmail(value) {
  return EMAIL_PATTERN.test(value);
}

export const registerSchema = z.object({
  name: z
    .string({ error: 'Please enter your name.' })
    .trim()
    .min(1, 'Please enter your name.')
    .max(80, 'Name must be 80 characters or fewer.'),
  email: z
    .string({ error: 'Please enter a valid email address.' })
    .trim()
    .toLowerCase()
    .refine(looksLikeEmail, 'Please enter a valid email address.'),
  password: z
    .string({ error: 'Password must be at least 8 characters long.' })
    .min(8, 'Password must be at least 8 characters long.')
    .max(72, 'Password must be 72 characters or fewer.'),
});

export const loginSchema = z.object({
  email: z
    .string({ error: 'Please enter a valid email address.' })
    .trim()
    .toLowerCase()
    .refine(looksLikeEmail, 'Please enter a valid email address.'),
  password: z
    .string({ error: 'Please enter your password.' })
    .min(1, 'Please enter your password.'),
});
