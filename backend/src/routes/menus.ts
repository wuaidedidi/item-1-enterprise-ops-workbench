import type { FastifyInstance } from 'fastify';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { menuResources, roles } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { buildPage, writeAuditRecord } from '../services/shared.js';
import { validate } from '../utils/validation.js';

const menuSchema = z.object({
  parentId: z.coerce.number().int().optional(),
  title: z.string().min(2, '菜单名称至少2个字符').max(30, '菜单名称最多30个字符'),
  path: z.string().min(1, '请输入路由路径'),
  icon: z.string().max(40, '图标名称最多40个字符').optional(),
  type: z.enum(['dir', 'menu', 'button']),
  permissionCode: z.string().max(60, '权限标识最多60个字符').optional(),
  component: z.string().max(120, '组件路径最多120个字符').optional(),
  sort: z.coerce.number().int().min(0).default(0),
  visible: z.boolean().default(true),
  status: z.enum(['enabled', 'disabled']).default('enabled'),
  remark: z.string().max(200, '备注最多200个字符').optional()
});

function buildTree(items: Array<Record<string, any>>, parentId: number | null = null): any[] {
  return items
    .filter((item) => (item.parentId ?? null) === parentId)
    .sort((a, b) => a.sort - b.sort || a.id - b.id)
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id)
    }));
}

export async function menuRoutes(app: FastifyInstance) {
  app.get('/menus', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('menu:view') && !request.authUser!.isAdmin) throw new AppError('没有查看菜单资源的权限', 403, 403);
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        keyword: z.string().optional().default('')
      }),
      request.query
    );
    const where = query.keyword ? orLike(query.keyword) : undefined;
    const total = await db.select({ c: sql<number>`count(*)` }).from(menuResources).where(where as any);
    const list = await db
      .select()
      .from(menuResources)
      .where(where as any)
      .orderBy(desc(menuResources.sort), desc(menuResources.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return ok(buildPage(query.page, query.pageSize, total[0]?.c || 0, list));
  });

  app.get('/menus/tree', { preHandler: app.authenticate }, async () => {
    const list = await db.select().from(menuResources).orderBy(desc(menuResources.sort), desc(menuResources.id));
    return ok(buildTree(list));
  });

  app.post('/menus', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('menu:create') && !request.authUser!.isAdmin) throw new AppError('没有新增菜单的权限', 403, 403);
    const body = validate(menuSchema, request.body);
    await db.insert(menuResources).values({
      parentId: body.parentId || null,
      title: body.title,
      path: body.path,
      icon: body.icon || null,
      type: body.type,
      permissionCode: body.permissionCode || null,
      component: body.component || null,
      sort: body.sort,
      visible: body.visible,
      status: body.status,
      remark: body.remark || null,
      createdAt: now(),
      updatedAt: now()
    });
    await writeAuditRecord({
      actionType: 'MENU_CREATE',
      module: '权限中心',
      entityType: 'menu_resources',
      entityId: body.path,
      afterData: body,
      operatorId: request.authUser!.id,
      operatorName: request.authUser!.userName,
      result: 'success'
    });
    return ok(null, '菜单创建成功');
  });

  app.put('/menus/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('menu:update') && !request.authUser!.isAdmin) throw new AppError('没有编辑菜单的权限', 403, 403);
    const id = Number((request.params as any).id);
    const body = validate(menuSchema.partial(), request.body);
    const current = await db.select().from(menuResources).where(eq(menuResources.id, id)).limit(1);
    if (!current.length) throw new AppError('菜单不存在', 404, 404);
    await db
      .update(menuResources)
      .set({
        parentId: body.parentId ?? current[0].parentId,
        title: body.title ?? current[0].title,
        path: body.path ?? current[0].path,
        icon: body.icon !== undefined ? body.icon || null : current[0].icon,
        type: body.type ?? current[0].type,
        permissionCode: body.permissionCode !== undefined ? body.permissionCode || null : current[0].permissionCode,
        component: body.component !== undefined ? body.component || null : current[0].component,
        sort: body.sort ?? current[0].sort,
        visible: body.visible ?? !!current[0].visible,
        status: body.status ?? current[0].status,
        remark: body.remark !== undefined ? body.remark || null : current[0].remark,
        updatedAt: now()
      })
      .where(eq(menuResources.id, id));
    return ok(null, '菜单更新成功');
  });

  app.delete('/menus/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('menu:delete') && !request.authUser!.isAdmin) throw new AppError('没有删除菜单的权限', 403, 403);
    const id = Number((request.params as any).id);
    const current = await db.select().from(menuResources).where(eq(menuResources.id, id)).limit(1);
    if (!current.length) throw new AppError('菜单不存在', 404, 404);
    const childCount = await db.select({ c: sql<number>`count(*)` }).from(menuResources).where(eq(menuResources.parentId, id));
    if ((childCount[0]?.c || 0) > 0) throw new AppError('该菜单下还有子项，无法删除', 400, 400);
    const roleCount = await db.select({ c: sql<number>`count(*)` }).from(roles).where(like(roles.menuIds, `%${id}%`));
    if ((roleCount[0]?.c || 0) > 0) {
      throw new AppError('该菜单已分配给角色，无法删除', 400, 400);
    }
    await db.delete(menuResources).where(eq(menuResources.id, id));
    return ok(null, '菜单删除成功');
  });

  function orLike(keyword: string) {
    return like(menuResources.title, `%${keyword}%`);
  }
}
