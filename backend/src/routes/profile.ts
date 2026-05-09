import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { users } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { validate } from '../utils/validation.js';
import { buildCurrentUser, writeOperationLog } from '../services/shared.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const profileSchema = z.object({
  realName: z.string().min(2, '姓名至少2个字符').max(20, '姓名最多20个字符'),
  phone: z.string().trim().regex(/^$|^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
  email: z.string().trim().regex(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, '邮箱格式不正确').optional()
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6位'),
  confirmPassword: z.string().min(6, '请再次输入新密码')
});

export async function profileRoutes(app: FastifyInstance) {
  app.get('/profile/me', { preHandler: app.authenticate }, async (request) => {
    const current = await buildCurrentUser(request.authUser!.id);
    if (!current) throw new AppError('用户信息不存在', 404, 404);
    return ok(current);
  });

  app.put('/profile/me', { preHandler: app.authenticate }, async (request) => {
    const body = validate(profileSchema, request.body);
    const current = await buildCurrentUser(request.authUser!.id);
    if (!current) throw new AppError('用户信息不存在', 404, 404);
    const nowTs = now();
    await db
      .update(users)
      .set({
        realName: body.realName,
        phone: body.phone || null,
        email: body.email || null,
        updatedAt: nowTs
      })
      .where(eq(users.id, current.id));
    await writeOperationLog({
      userId: current.id,
      userName: current.userName,
      module: '个人中心',
      action: 'PROFILE_UPDATE',
      method: 'PUT',
      path: '/api/profile/me',
      status: 200,
      message: '资料更新成功',
      ip: request.ip
    });
    return ok(await buildCurrentUser(current.id), '资料更新成功');
  });

  app.put('/profile/password', { preHandler: app.authenticate }, async (request) => {
    const body = validate(passwordSchema, request.body);
    if (body.newPassword !== body.confirmPassword) {
      throw new AppError('两次输入的新密码不一致', 400, 400);
    }
    const currentRow = await db.select().from(users).where(eq(users.id, request.authUser!.id)).limit(1);
    if (!currentRow.length || !verifyPassword(body.oldPassword, currentRow[0].passwordHash)) {
      throw new AppError('原密码不正确', 400, 400);
    }
    await db
      .update(users)
      .set({
        passwordHash: hashPassword(body.newPassword),
        updatedAt: now()
      })
      .where(eq(users.id, request.authUser!.id));
    await writeOperationLog({
      userId: request.authUser!.id,
      userName: request.authUser!.userName,
      module: '个人中心',
      action: 'PASSWORD_UPDATE',
      method: 'PUT',
      path: '/api/profile/password',
      status: 200,
      message: '密码修改成功',
      ip: request.ip
    });
    return ok(null, '密码修改成功');
  });
}
