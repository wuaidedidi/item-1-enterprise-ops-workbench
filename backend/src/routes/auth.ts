import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { departments, roles, users } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { validate } from '../utils/validation.js';
import { buildCurrentUser, writeOperationLog } from '../services/shared.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', { config: { public: true } }, async (request, reply) => {
    const body = validate(
      z.object({
        userName: z.string().min(1, '请输入用户名'),
        password: z.string().min(1, '请输入密码')
      }),
      request.body
    );

    const row = await db
      .select({
        id: users.id,
        userName: users.userName,
        realName: users.realName,
        passwordHash: users.passwordHash,
        status: users.status,
        roleCode: roles.code,
        roleName: roles.name,
        roleId: roles.id,
        isAdmin: users.isAdmin
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.userName, body.userName))
      .limit(1);

    if (!row.length || row[0].status !== 'enabled' || !verifyPassword(body.password, row[0].passwordHash)) {
      await writeOperationLog({
        module: '认证',
        action: 'LOGIN_FAIL',
        method: 'POST',
        path: '/api/auth/login',
        status: 401,
        message: '用户名或密码错误',
        ip: request.ip,
        userName: body.userName
      });
      throw new AppError('用户名或密码错误', 401, 401);
    }

    const current = await buildCurrentUser(row[0].id);
    if (!current) {
      throw new AppError('用户信息不存在', 404, 404);
    }
    const token = app.jwt.sign({
      sub: String(current.id),
      userName: current.userName,
      realName: current.realName
    });

    await db
      .update(users)
      .set({
        lastLoginAt: now(),
        lastLoginIp: request.ip,
        updatedAt: now()
      })
      .where(eq(users.id, current.id));

    await writeOperationLog({
      userId: current.id,
      userName: current.userName,
      module: '认证',
      action: 'LOGIN',
      method: 'POST',
      path: '/api/auth/login',
      status: 200,
      message: '登录成功',
      ip: request.ip
    });

    return ok(
      {
        token,
        user: current
      },
      '登录成功'
    );
  });

  app.post('/auth/register', { config: { public: true } }, async (request) => {
    const body = validate(
      z.object({
        userName: z.string().min(2, '用户名至少2个字符').max(30, '用户名最多30个字符'),
        realName: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
        password: z.string().min(6, '密码至少6位'),
        phone: z.string().trim().regex(/^$|^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
        email: z.string().trim().regex(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, '邮箱格式不正确').optional()
      }),
      request.body
    );

    const existed = await db.select({ id: users.id }).from(users).where(eq(users.userName, body.userName)).limit(1);
    if (existed.length) throw new AppError('用户名已存在', 400, 400);
    const role = await db.select().from(roles).where(eq(roles.code, 'biz')).limit(1);
    const department = await db.select().from(departments).where(eq(departments.code, 'BIZ')).limit(1);
    if (!role.length || !department.length) throw new AppError('系统初始化不完整，请联系管理员', 500, 500);

    const nowTs = now();
    await db.insert(users).values({
      userName: body.userName,
      realName: body.realName,
      passwordHash: hashPassword(body.password),
      phone: body.phone || null,
      email: body.email || null,
      departmentId: department[0].id,
      roleId: role[0].id,
      status: 'enabled',
      isAdmin: false,
      createdAt: nowTs,
      updatedAt: nowTs
    });

    return ok(null, '注册成功');
  });

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    const current = await buildCurrentUser(request.authUser!.id);
    if (!current) throw new AppError('用户信息不存在', 404, 404);
    return ok(current);
  });

  app.post('/auth/logout', { preHandler: app.authenticate }, async () => ok(null, '退出成功'));
}
