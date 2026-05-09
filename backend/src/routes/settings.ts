import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { systemSettings } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { validate } from '../utils/validation.js';

export async function settingRoutes(app: FastifyInstance) {
  app.get('/settings', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('setting:view') && !request.authUser!.isAdmin && request.authUser!.roleCode !== 'ops') {
      throw new AppError('没有查看系统参数的权限', 403, 403);
    }
    const list = await db.select().from(systemSettings);
    return ok(list);
  });

  app.put('/settings/:key', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('setting:update') && !request.authUser!.isAdmin && request.authUser!.roleCode !== 'ops') {
      throw new AppError('没有编辑系统参数的权限', 403, 403);
    }
    const key = String((request.params as any).key);
    const body = validate(
      z.object({
        settingValue: z.string().min(1, '请输入参数值')
      }),
      request.body
    );
    const current = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key)).limit(1);
    if (!current.length) throw new AppError('系统参数不存在', 404, 404);
    await db
      .update(systemSettings)
      .set({
        settingValue: body.settingValue,
        updatedBy: request.authUser!.userName,
        updatedAt: now()
      })
      .where(eq(systemSettings.settingKey, key));
    return ok(null, '参数保存成功');
  });
}
