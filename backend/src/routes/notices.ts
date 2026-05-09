import type { FastifyInstance } from 'fastify';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, now } from '../db/client.js';
import { notices, noticeReads, users, roles } from '../db/schema.js';
import { AppError, ok } from '../utils/http.js';
import { buildPage, writeAuditRecord, writeOperationLog } from '../services/shared.js';
import { parseJsonArray } from '../utils/json.js';
import { validate } from '../utils/validation.js';

const noticeSchema = z.object({
  title: z.string().min(2, '公告标题至少2个字符').max(50, '公告标题最多50个字符'),
  content: z.string().min(5, '公告内容至少5个字符'),
  level: z.enum(['low', 'normal', 'high']).default('normal'),
  targetRoleCodes: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  expireAt: z.coerce.number().int().optional()
});

export async function noticeRoutes(app: FastifyInstance) {
  app.get('/notices', { preHandler: app.authenticate }, async (request) => {
    const query = validate(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
        keyword: z.string().optional().default(''),
        status: z.string().optional(),
        scope: z.enum(['all', 'mine']).optional()
      }),
      request.query
    );
    const isManager = request.authUser!.isAdmin || ['admin', 'ops', 'audit'].includes(request.authUser!.roleCode);
    const conditions = [] as any[];
    if (query.keyword) conditions.push(like(notices.title, `%${query.keyword}%`));
    if (query.status) conditions.push(eq(notices.status, query.status));
    if (!isManager || query.scope === 'mine') {
      conditions.push(sql`json_array_length(${notices.targetRoleCodes}) = 0 OR instr(${notices.targetRoleCodes}, ${request.authUser!.roleCode}) > 0`);
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const total = await db.select({ c: sql<number>`count(*)` }).from(notices).where(where as any);
    const list = await db
      .select({
        id: notices.id,
        title: notices.title,
        content: notices.content,
        level: notices.level,
        publisherId: notices.publisherId,
        targetRoleCodes: notices.targetRoleCodes,
        status: notices.status,
        publishAt: notices.publishAt,
        expireAt: notices.expireAt,
        createdAt: notices.createdAt,
        updatedAt: notices.updatedAt,
        publisherName: users.realName
      })
      .from(notices)
      .leftJoin(users, eq(notices.publisherId, users.id))
      .where(where as any)
      .orderBy(desc(notices.publishAt), desc(notices.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const readRows = await db.select().from(noticeReads).where(eq(noticeReads.userId, request.authUser!.id));
    const mapped = list.map((item) => {
      const read = readRows.find((row) => row.noticeId === item.id);
      return {
        ...item,
        targetRoleCodes: parseJsonArray(item.targetRoleCodes),
        readStatus: read?.readStatus || 'unread',
        processedStatus: read?.processedStatus || 'pending',
        readAt: read?.readAt || null
      };
    });
    return ok(buildPage(query.page, query.pageSize, total[0]?.c || 0, mapped));
  });

  app.get('/notices/:id', { preHandler: app.authenticate }, async (request) => {
    const id = Number((request.params as any).id);
    const current = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
    if (!current.length) throw new AppError('公告不存在', 404, 404);
    return ok({
      ...current[0],
      targetRoleCodes: parseJsonArray(current[0].targetRoleCodes)
    });
  });

  app.post('/notices', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('notice:create') && !request.authUser!.isAdmin) throw new AppError('没有发布公告的权限', 403, 403);
    const body = validate(noticeSchema, request.body);
    const nowTs = now();
    await db.insert(notices).values({
      title: body.title,
      content: body.content,
      level: body.level,
      publisherId: request.authUser!.id,
      targetRoleCodes: JSON.stringify(body.targetRoleCodes),
      status: body.status,
      publishAt: body.status === 'published' ? nowTs : null,
      expireAt: body.expireAt || null,
      createdAt: nowTs,
      updatedAt: nowTs
    });
    await writeAuditRecord({
      actionType: 'NOTICE_CREATE',
      module: '公告中心',
      entityType: 'notices',
      entityId: body.title,
      afterData: body,
      operatorId: request.authUser!.id,
      operatorName: request.authUser!.userName,
      result: 'success'
    });
    return ok(null, '公告创建成功');
  });

  app.put('/notices/:id', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('notice:update') && !request.authUser!.isAdmin) throw new AppError('没有编辑公告的权限', 403, 403);
    const id = Number((request.params as any).id);
    const body = validate(noticeSchema.partial(), request.body);
    const current = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
    if (!current.length) throw new AppError('公告不存在', 404, 404);
    await db
      .update(notices)
      .set({
        title: body.title ?? current[0].title,
        content: body.content ?? current[0].content,
        level: body.level ?? current[0].level,
        targetRoleCodes: body.targetRoleCodes ? JSON.stringify(body.targetRoleCodes) : current[0].targetRoleCodes,
        status: body.status ?? current[0].status,
        publishAt: body.status === 'published' && !current[0].publishAt ? now() : current[0].publishAt,
        expireAt: body.expireAt !== undefined ? body.expireAt || null : current[0].expireAt,
        updatedAt: now()
      })
      .where(eq(notices.id, id));
    return ok(null, '公告更新成功');
  });

  app.post('/notices/:id/publish', { preHandler: app.authenticate }, async (request) => {
    if (!request.authUser!.permissions.includes('notice:publish') && !request.authUser!.isAdmin) throw new AppError('没有发布公告的权限', 403, 403);
    const id = Number((request.params as any).id);
    const current = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
    if (!current.length) throw new AppError('公告不存在', 404, 404);
    await db
      .update(notices)
      .set({
        status: 'published',
        publishAt: current[0].publishAt || now(),
        updatedAt: now()
      })
      .where(eq(notices.id, id));
    return ok(null, '公告已发布');
  });

  app.post('/notices/:id/read', { preHandler: app.authenticate }, async (request) => {
    const id = Number((request.params as any).id);
    const current = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
    if (!current.length) throw new AppError('公告不存在', 404, 404);
    const nowTs = now();
    const existed = await db.select().from(noticeReads).where(and(eq(noticeReads.noticeId, id), eq(noticeReads.userId, request.authUser!.id))).limit(1);
    if (existed.length) {
      await db
        .update(noticeReads)
        .set({
          readStatus: 'read',
          processedStatus: 'done',
          readAt: existed[0].readAt || nowTs,
          processedAt: nowTs,
          updatedAt: nowTs
        })
        .where(eq(noticeReads.id, existed[0].id));
    } else {
      await db.insert(noticeReads).values({
        noticeId: id,
        userId: request.authUser!.id,
        readStatus: 'read',
        processedStatus: 'done',
        readAt: nowTs,
        processedAt: nowTs,
        createdAt: nowTs,
        updatedAt: nowTs
      });
    }
    await writeOperationLog({
      userId: request.authUser!.id,
      userName: request.authUser!.userName,
      module: '公告中心',
      action: 'NOTICE_READ',
      method: 'POST',
      path: `/api/notices/${id}/read`,
      status: 200,
      message: '公告已确认阅读',
      ip: request.ip
    });
    return ok(null, '已确认阅读');
  });
}
