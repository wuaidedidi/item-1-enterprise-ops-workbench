import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { operationLogs } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { buildPage } from '../services/shared.js';
import { validate } from '../utils/validation.js';

export async function logRoutes(app: FastifyInstance) {
  app.get('/logs/operations', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('log:view') && !request.authUser!.isAdmin && request.authUser!.roleCode !== 'audit') {
      throw new AppError('没有查看操作日志的权限', 403, 403);
    }
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        keyword: z.string().optional().default(''),
        module: z.string().optional().default(''),
        action: z.string().optional().default(''),
        startAt: z.coerce.number().int().optional()
      }),
      request.query
    );
    const conditions = [] as any[];
    if (query.keyword) conditions.push(like(operationLogs.message, `%${query.keyword}%`));
    if (query.module) conditions.push(eq(operationLogs.module, query.module));
    if (query.action) conditions.push(eq(operationLogs.action, query.action));
    if (query.startAt) conditions.push(gte(operationLogs.createdAt, query.startAt));
    if (!(request.authUser!.isAdmin || request.authUser!.roleCode === 'audit')) {
      conditions.push(eq(operationLogs.userId, request.authUser!.id));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const total = await db.select({ c: sql<number>`count(*)` }).from(operationLogs).where(where as any);
    const list = await db
      .select()
      .from(operationLogs)
      .where(where as any)
      .orderBy(desc(operationLogs.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return ok(buildPage(query.page, query.pageSize, total[0]?.c || 0, list));
  });
}
