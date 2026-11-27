import { z } from 'zod';

/**
 * The targets a patient can change. The ranges are checked so that the low limit always stays
 * below the high limit and the goals stay realistic.
 */
export const targetsSchema = z
  .object({
    fastingMin: z.number().int().min(40).max(150),
    fastingMax: z.number().int().min(60).max(250),
    postMealMin: z.number().int().min(40).max(150),
    postMealMax: z.number().int().min(80).max(300),
    tirGoal: z.number().int().min(30).max(100),
    a1cGoal: z.number().min(4).max(14),
  })
  .refine((value) => value.fastingMin < value.fastingMax, {
    message: 'The fasting target must be a range, not a single value.',
    path: ['fastingMax'],
  })
  .refine((value) => value.postMealMin < value.postMealMax, {
    message: 'The post-meal target must be a range, not a single value.',
    path: ['postMealMax'],
  });

export const linkPatientSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
});
