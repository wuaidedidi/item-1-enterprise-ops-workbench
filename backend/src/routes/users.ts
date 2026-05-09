import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { departments, operationLogs, roles, users, notices, auditRecords } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { buildPage, writeAuditRecord, writeOperationLog } from '../services/shared.js';
import { validate } from '../utils/validation.js';
import { hashPassword } from '../utils/password.js';

const userCreateSchema = z.object({
  userName: z.string().min(2, '用户名至少2个字符').max(30, '用户名最多30个字符'),
  realName: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
  password: z.string().min(6, '密码至少6位'),
  phone: z.string().trim().regex(/^$|^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
  email: z.string().trim().regex(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, '邮箱格式不正确').optional(),
  departmentId: z.coerce.number().int().optional(),
  roleId: z.coerce.number().int().optional(),
  status: z.enum(['enabled', 'disabled']).default('enabled')
});

const userUpdateSchema = userCreateSchema.partial();

export async function userRoutes(app: FastifyInstance) {
  app.get('/users', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('user:view') && !request.authUser!.isAdmin) {
      throw new AppError('没有查看用户账号的权限', 403, 403);
    }
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        keyword: z.string().optional().default(''),
        status: z.enum(['enabled', 'disabled']).optional(),
        roleId: z.coerce.number().int().optional(),
        departmentId: z.coerce.number().int().optional()
      }),
      request.query
    );
    const conditions = [] as any[];
    if (query.keyword) conditions.push(or(like(users.userName, `%${query.keyword}%`), like(users.realName, `%${query.keyword}%`), like(users.phone, `%${query.keyword}%`), like(users.email, `%${query.keyword}%`)));
    if (query.status) conditions.push(eq(users.status, query.status));
    if (query.roleId) conditions.push(eq(users.roleId, query.roleId));
    if (query.departmentId) conditions.push(eq(users.departmentId, query.departmentId));

    const where = conditions.length ? and(...conditions) : undefined;
    const totalRow = await db.select({ c: sql<number>`count(*)` }).from(users).where(where as any);
    const list = await db
      .select({
        id: users.id,
        userName: users.userName,
        realName: users.realName,
        phone: users.phone,
        email: users.email,
        status: users.status,
        isAdmin: users.isAdmin,
        lastLoginAt: users.lastLoginAt,
        lastLoginIp: users.lastLoginIp,
        createdAt: users.createdAt,
        roleName: roles.name,
        roleCode: roles.code,
        departmentName: departments.name,
        departmentCode: departments.code
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(where as any)
      .orderBy(desc(users.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    return ok(buildPage(query.page, query.pageSize, totalRow[0]?.c || 0, list));
  });

  app.get('/users/options', { preHandler: app.authenticate }, async () => {
    const list = await db.select({ id: users.id, label: users.realName, value: users.id }).from(users).orderBy(desc(users.id));
    return ok(list);
  });

  app.post('/users', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('user:create') && !request.authUser!.isAdmin) throw new AppError('没有新增用户的权限', 403, 403);
    const body = validate(userCreateSchema, request.body);
    const existed = await db.select({ id: users.id }).from(users).where(eq(users.userName, body.userName)).limit(1);
    if (existed.length) throw new AppError('用户名已存在', 400, 400);
    const roleList = await db.select().from(roles).orderBy(desc(roles.id));
    const bizRole = roleList.find((item) => item.code === 'biz');
    const role = body.roleId ? roleList.find((item) => item.id === body.roleId) : bizRole;
    if (!role) throw new AppError('未找到默认角色，请联系管理员', 500, 500);
    const department = body.departmentId ? await db.select().from(departments).where(eq(departments.id, body.departmentId)).limit(1) : [];
    const nowTs = now();
    const payload = {
      userName: body.userName,
      realName: body.realName,
      passwordHash: hashPassword(body.password),
      phone: body.phone || null,
      email: body.email || null,
      departmentId: body.departmentId || department[0]?.id || null,
      roleId: role.id,
      status: body.status,
      isAdmin: role.code === 'admin',
      createdAt: nowTs,
      updatedAt: nowTs
    };
    await db.insert(users).values(payload);
    await writeOperationLog({
      userId: request.authUser!.id,
      userName: request.authUser!.userName,
      module: '用户管理',
      action: 'USER_CREATE',
      method: 'POST',
      path: '/api/users',
      status: 200,
      message: '用户创建成功',
      ip: request.ip
    });
    return ok(null, '用户创建成功');
  });

  app.put('/users/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('user:update') && !request.authUser!.isAdmin) throw new AppError('没有编辑用户的权限', 403, 403);
    const id = Number((request.params as any).id);
    const body = validate(userUpdateSchema, request.body);
    const current = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!current.length) throw new AppError('用户不存在', 404, 404);
    if (id === request.authUser!.id && (body.roleId !== undefined || body.status === 'disabled')) {
      throw new AppError('不能修改自己的角色或停用自己的账号', 400, 400);
    }
    const roleList = await db.select().from(roles);
    const nextRoleId = body.roleId ?? current[0].roleId;
    const nextRole = roleList.find((item) => item.id === nextRoleId);
    if (!nextRole) throw new AppError('请选择有效的角色', 400, 400);
    if (body.userName) {
      const existed = await db.select({ id: users.id }).from(users).where(and(eq(users.userName, body.userName), sql`${users.id} != ${id}`)).limit(1);
      if (existed.length) throw new AppError('用户名已存在', 400, 400);
    }
    await db
      .update(users)
      .set({
        userName: body.userName ?? current[0].userName,
        realName: body.realName ?? current[0].realName,
        phone: body.phone !== undefined ? body.phone || null : current[0].phone,
        email: body.email !== undefined ? body.email || null : current[0].email,
        departmentId: body.departmentId ?? current[0].departmentId,
        roleId: nextRole.id,
        status: body.status ?? current[0].status,
        isAdmin: nextRole.code === 'admin',
        updatedAt: now()
      })
      .where(eq(users.id, id));

    await writeAuditRecord({
      actionType: 'USER_UPDATE',
      module: '用户管理',
      entityType: 'users',
      entityId: String(id),
      beforeData: current[0],
      afterData: body,
      operatorId: request.authUser!.id,
      operatorName: request.authUser!.userName,
      result: 'success'
    });
    return ok(null, '用户更新成功');
  });

  app.delete('/users/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('user:delete') && !request.authUser!.isAdmin) throw new AppError('没有删除用户的权限', 403, 403);
    const id = Number((request.params as any).id);
    if (id === request.authUser!.id) throw new AppError('不能删除当前登录账号', 400, 400);
    const current = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!current.length) throw new AppError('用户不存在', 404, 404);
    const noticeCount = await db.select({ c: sql<number>`count(*)` }).from(notices).where(eq(notices.publisherId, id));
    const opCount = await db.select({ c: sql<number>`count(*)` }).from(operationLogs).where(eq(operationLogs.userId, id));
    const auditCount = await db.select({ c: sql<number>`count(*)` }).from(auditRecords).where(eq(auditRecords.operatorId, id));
    if ((noticeCount[0]?.c || 0) > 0) throw new AppError('该账号已发布公告，无法删除', 400, 400);
    if ((opCount[0]?.c || 0) > 0 || (auditCount[0]?.c || 0) > 0) throw new AppError('该账号已有操作留痕，无法删除', 400, 400);
    await db.delete(users).where(eq(users.id, id));
    return ok(null, '用户删除成功');
  });
}
