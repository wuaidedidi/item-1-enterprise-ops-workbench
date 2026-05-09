import { z } from 'zod';
import { AppError } from './http.js';

export function validate<T>(schema: z.ZodType<T>, data: unknown, message = '请求参数不合法') {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new AppError(first?.message || message, 400, 400);
  }
  return result.data;
}

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('编号必须是正整数')
});

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().optional().default('')
});
