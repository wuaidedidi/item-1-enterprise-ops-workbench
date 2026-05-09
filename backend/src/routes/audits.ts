import type { FastifyInstance } from 'fastify';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { auditRecords } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { buildPage } from '../services/shared.js';
import { validate } from '../utils/validation.js';

export async function auditRoutes(app: FastifyInstance) {
  app.get('/audits', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('audit:view') && !request.authUser!.isAdmin && request.authUser!.roleCode !== 'audit') {
      throw new AppError('没有查看审计记录的权限', 403, 403);
    }
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        keyword: z.string().optional().default(''),
        module: z.string().optional().default(''),
        actionType: z.string().optional().default('')
      }),
      request.query
    );
    const conditions = [] as any[];
    if (query.keyword) conditions.push(like(auditRecords.entityType, `%${query.keyword}%`));
    if (query.module) conditions.push(eq(auditRecords.module, query.module));
    if (query.actionType) conditions.push(eq(auditRecords.actionType, query.actionType));
    const where = conditions.length ? and(...conditions) : undefined;
    const total = await db.select({ c: sql<number>`count(*)` }).from(auditRecords).where(where as any);
    const list = await db
      .select()
      .from(auditRecords)
      .where(where as any)
      .orderBy(desc(auditRecords.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return ok(buildPage(query.page, query.pageSize, total[0]?.c || 0, list));
  });
}
