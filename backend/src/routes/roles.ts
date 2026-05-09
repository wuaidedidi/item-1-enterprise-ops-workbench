import type { FastifyInstance } from 'fastify';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { roles, users } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { buildPage, writeAuditRecord } from '../services/shared.js';
import { parseJsonArray, stringifyJson } from '../utils/json.js';
import { validate } from '../utils/validation.js';

const roleSchema = z.object({
  name: z.string().min(2, '角色名称至少2个字符').max(30, '角色名称最多30个字符'),
  code: z.string().min(2, '角色编码至少2个字符').max(30, '角色编码最多30个字符'),
  description: z.string().max(200, '描述最多200个字符').optional(),
  status: z.enum(['enabled', 'disabled']).default('enabled'),
  menuIds: z.array(z.number().int()).default([]),
  buttonPermissions: z.array(z.string()).default([])
});

export async function roleRoutes(app: FastifyInstance) {
  app.get('/roles', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('role:view') && !request.authUser!.isAdmin) throw new AppError('没有查看角色的权限', 403, 403);
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        keyword: z.string().optional().default('')
      }),
      request.query
    );
    const where = query.keyword ? orLike(query.keyword) : undefined;
    const total = await db.select({ c: sql<number>`count(*)` }).from(roles).where(where as any);
    const list = await db
      .select({
        id: roles.id,
        name: roles.name,
        code: roles.code,
        description: roles.description,
        status: roles.status,
        isSystem: roles.isSystem,
        menuIds: roles.menuIds,
        buttonPermissions: roles.buttonPermissions,
        createdAt: roles.createdAt
      })
      .from(roles)
      .where(where as any)
      .orderBy(desc(roles.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return ok(buildPage(query.page, query.pageSize, total[0]?.c || 0, list.map((item) => ({ ...item, menuIds: parseJsonArray(item.menuIds), buttonPermissions: parseJsonArray(item.buttonPermissions) }))));
  });

  app.get('/roles/options', { preHandler: app.authenticate }, async () => {
    const list = await db.select({ value: roles.id, label: roles.name, code: roles.code }).from(roles).orderBy(desc(roles.id));
    return ok(list);
  });

  app.post('/roles', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('role:create') && !request.authUser!.isAdmin) throw new AppError('没有新增角色的权限', 403, 403);
    const body = validate(roleSchema, request.body);
    const existed = await db.select({ id: roles.id }).from(roles).where(eq(roles.code, body.code)).limit(1);
    if (existed.length) throw new AppError('角色编码已存在', 400, 400);
    await db.insert(roles).values({
      name: body.name,
      code: body.code,
      description: body.description || null,
      status: body.status,
      isSystem: false,
      menuIds: stringifyJson(body.menuIds),
      buttonPermissions: stringifyJson(body.buttonPermissions),
      createdAt: now(),
      updatedAt: now()
    });
    await writeAuditRecord({
      actionType: 'ROLE_CREATE',
      module: '权限中心',
      entityType: 'roles',
      entityId: body.code,
      afterData: body,
      operatorId: request.authUser!.id,
      operatorName: request.authUser!.userName,
      result: 'success'
    });
    return ok(null, '角色创建成功');
  });

  app.put('/roles/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('role:update') && !request.authUser!.isAdmin) throw new AppError('没有编辑角色的权限', 403, 403);
    const id = Number((request.params as any).id);
    const body = validate(roleSchema.partial(), request.body);
    const current = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!current.length) throw new AppError('角色不存在', 404, 404);
    if (current[0].isSystem && body.code && body.code !== current[0].code) throw new AppError('系统角色不可修改编码', 400, 400);
    if (body.code) {
      const existed = await db.select({ id: roles.id }).from(roles).where(and(eq(roles.code, body.code), sql`${roles.id} != ${id}`)).limit(1);
      if (existed.length) throw new AppError('角色编码已存在', 400, 400);
    }
    await db
      .update(roles)
      .set({
        name: body.name ?? current[0].name,
        code: body.code ?? current[0].code,
        description: body.description !== undefined ? body.description || null : current[0].description,
        status: body.status ?? current[0].status,
        menuIds: body.menuIds ? stringifyJson(body.menuIds) : current[0].menuIds,
        buttonPermissions: body.buttonPermissions ? stringifyJson(body.buttonPermissions) : current[0].buttonPermissions,
        updatedAt: now()
      })
      .where(eq(roles.id, id));
    await writeAuditRecord({
      actionType: 'ROLE_UPDATE',
      module: '权限中心',
      entityType: 'roles',
      entityId: String(id),
      beforeData: current[0],
      afterData: body,
      operatorId: request.authUser!.id,
      operatorName: request.authUser!.userName,
      result: 'success'
    });
    return ok(null, '角色更新成功');
  });

  app.delete('/roles/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('role:delete') && !request.authUser!.isAdmin) throw new AppError('没有删除角色的权限', 403, 403);
    const id = Number((request.params as any).id);
    const current = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!current.length) throw new AppError('角色不存在', 404, 404);
    if (current[0].isSystem) throw new AppError('系统角色不能删除', 400, 400);
    const userCount = await db.select({ c: sql<number>`count(*)` }).from(users).where(eq(users.roleId, id));
    if ((userCount[0]?.c || 0) > 0) throw new AppError('该角色下还有用户，无法删除', 400, 400);
    await db.delete(roles).where(eq(roles.id, id));
    return ok(null, '角色删除成功');
  });

  function orLike(keyword: string) {
    return orLikeInner(keyword);
  }

  function orLikeInner(keyword: string) {
    return orLikeValue(keyword);
  }

  function orLikeValue(keyword: string) {
    return like(roles.name, `%${keyword}%`);
  }
}
