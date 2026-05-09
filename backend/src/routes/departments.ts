import type { FastifyInstance } from 'fastify';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { departments, users } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { buildPage, writeAuditRecord } from '../services/shared.js';
import { validate } from '../utils/validation.js';

const departmentSchema = z.object({
  name: z.string().min(2, '部门名称至少2个字符').max(30, '部门名称最多30个字符'),
  code: z.string().min(2, '部门编码至少2个字符').max(20, '部门编码最多20个字符'),
  leaderName: z.string().max(20, '负责人最多20个字符').optional(),
  parentId: z.coerce.number().int().optional(),
  sort: z.coerce.number().int().min(0).default(0),
  status: z.enum(['enabled', 'disabled']).default('enabled')
});

export async function departmentRoutes(app: FastifyInstance) {
  app.get('/departments', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('department:view') && !request.authUser!.isAdmin) throw new AppError('没有查看部门的权限', 403, 403);
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        keyword: z.string().optional().default('')
      }),
      request.query
    );
    const where = query.keyword ? or(like(departments.name, `%${query.keyword}%`), like(departments.code, `%${query.keyword}%`)) : undefined;
    const total = await db.select({ c: sql<number>`count(*)` }).from(departments).where(where as any);
    const list = await db
      .select({
        id: departments.id,
        parentId: departments.parentId,
        name: departments.name,
        code: departments.code,
        leaderName: departments.leaderName,
        sort: departments.sort,
        status: departments.status,
        createdAt: departments.createdAt
      })
      .from(departments)
      .where(where as any)
      .orderBy(desc(departments.sort), desc(departments.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return ok(buildPage(query.page, query.pageSize, total[0]?.c || 0, list));
  });

  app.post('/departments', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('department:create') && !request.authUser!.isAdmin) throw new AppError('没有新增部门的权限', 403, 403);
    const body = validate(departmentSchema, request.body);
    const existed = await db.select({ id: departments.id }).from(departments).where(eq(departments.code, body.code)).limit(1);
    if (existed.length) throw new AppError('部门编码已存在', 400, 400);
    await db.insert(departments).values({
      name: body.name,
      code: body.code,
      leaderName: body.leaderName || null,
      parentId: body.parentId || null,
      sort: body.sort,
      status: body.status,
      createdAt: now(),
      updatedAt: now()
    });
    await writeAuditRecord({
      actionType: 'DEPARTMENT_CREATE',
      module: '组织架构',
      entityType: 'departments',
      entityId: body.code,
      afterData: body,
      operatorId: request.authUser!.id,
      operatorName: request.authUser!.userName,
      result: 'success'
    });
    return ok(null, '部门创建成功');
  });

  app.put('/departments/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('department:update') && !request.authUser!.isAdmin) throw new AppError('没有编辑部门的权限', 403, 403);
    const id = Number((request.params as any).id);
    const body = validate(departmentSchema.partial(), request.body);
    const current = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!current.length) throw new AppError('部门不存在', 404, 404);
    if (body.code) {
      const existed = await db.select({ id: departments.id }).from(departments).where(and(eq(departments.code, body.code), sql`${departments.id} != ${id}`)).limit(1);
      if (existed.length) throw new AppError('部门编码已存在', 400, 400);
    }
    await db
      .update(departments)
      .set({
        name: body.name ?? current[0].name,
        code: body.code ?? current[0].code,
        leaderName: body.leaderName !== undefined ? body.leaderName || null : current[0].leaderName,
        parentId: body.parentId ?? current[0].parentId,
        sort: body.sort ?? current[0].sort,
        status: body.status ?? current[0].status,
        updatedAt: now()
      })
      .where(eq(departments.id, id));
    return ok(null, '部门更新成功');
  });

  app.delete('/departments/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('department:delete') && !request.authUser!.isAdmin) throw new AppError('没有删除部门的权限', 403, 403);
    const id = Number((request.params as any).id);
    const current = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!current.length) throw new AppError('部门不存在', 404, 404);
    const childCount = await db.select({ c: sql<number>`count(*)` }).from(departments).where(eq(departments.parentId, id));
    if ((childCount[0]?.c || 0) > 0) throw new AppError('该部门下还有子部门，无法删除', 400, 400);
    const userCount = await db.select({ c: sql<number>`count(*)` }).from(users).where(eq(users.departmentId, id));
    if ((userCount[0]?.c || 0) > 0) throw new AppError('该部门下还有用户，无法删除', 400, 400);
    await db.delete(departments).where(eq(departments.id, id));
    return ok(null, '部门删除成功');
  });
}
