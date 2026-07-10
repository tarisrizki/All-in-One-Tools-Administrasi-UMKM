import { z } from '@hono/zod-openapi';

export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.object({
    message: z.string(),
  }),
});

export function createSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean().default(true),
    data: dataSchema,
  });
}

export const MessageSuccessSchema = z.object({
  success: z.boolean().default(true),
  message: z.string(),
});
