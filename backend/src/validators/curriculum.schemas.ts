import { z } from 'zod';

export const lessonIdParamSchema = z.object({
  lessonId: z.string().min(1, 'lessonId is required')
});

export const validateStepSchema = z.object({
  stepNumber: z.number().int().positive('stepNumber must be a positive integer'),
  moveSan: z.string().optional(),
  moveFrom: z.string().optional(),
  moveTo: z.string().optional(),
  selectedOptionId: z.string().optional()
});

export type ValidateStepInput = z.infer<typeof validateStepSchema>;
