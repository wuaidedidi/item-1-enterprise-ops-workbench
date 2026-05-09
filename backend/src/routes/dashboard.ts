import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import { db } from '../db/client.js';
import { notices, noticeReads, operationLogs, roles, users } from '../db/schema.js';
import { ok } from '../utils/http.js';
import { parseJsonArray } from '../utils/json.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard/summary', { preHandler: app.authenticate }, async (request) => {
    const isWideScope = request.authUser!.isAdmin || ['admin', 'ops', 'audit'].includes(request.authUser!.roleCode);
    const todayStart = dayjs().startOf('day').valueOf();
    const todayEnd = dayjs().endOf('day').valueOf();
    const noticeRows = await db.select().from(notices);
    const myNoticeReads = await db.select().from(noticeReads).where(eq(noticeReads.userId, request.authUser!.id));
    const totalNoticeReads = await db.select({ c: sql<number>`count(*)` }).from(noticeReads);
    const readNoticeCount = await db.select({ c: sql<number>`count(*)` }).from(noticeReads).where(eq(noticeReads.readStatus, 'read'));

    const cards = isWideScope
      ? [
          { label: '活跃用户数', value: await db.select({ c: sql<number>`count(*)` }).from(users).where(eq(users.status, 'enabled')).then((r) => r[0]?.c || 0), hint: '当前启用账号' },
          {
            label: '公告阅读率',
            value: `${totalNoticeReads[0]?.c ? Math.round(((readNoticeCount[0]?.c || 0) / totalNoticeReads[0].c) * 100) : 0}%`,
            hint: '已读公告 / 总公告'
          },
          {
            label: '权限变更次数',
            value: await db.select({ c: sql<number>`count(*)` }).from(operationLogs).where(and(eq(operationLogs.action, 'ROLE_UPDATE'), gte(operationLogs.createdAt, todayStart))).then((r) => r[0]?.c || 0),
            hint: '今日变更'
          },
          {
            label: '今日操作总数',
            value: await db.select({ c: sql<number>`count(*)` }).from(operationLogs).where(gte(operationLogs.createdAt, todayStart)).then((r) => r[0]?.c || 0),
            hint: '全部模块'
          },
          {
            label: '异常登录数',
            value: await db.select({ c: sql<number>`count(*)` }).from(operationLogs).where(and(eq(operationLogs.action, 'LOGIN_FAIL'), gte(operationLogs.createdAt, todayStart))).then((r) => r[0]?.c || 0),
            hint: '今日失败登录'
          }
        ]
      : [
          {
            label: '待处理公告',
            value: myNoticeReads.filter((item) => item.processedStatus !== 'done').length,
            hint: '需要确认的事项'
          },
          {
            label: '已读公告',
            value: myNoticeReads.filter((item) => item.readStatus === 'read').length,
            hint: '个人阅读进度'
          },
          {
            label: '今日操作',
            value: await db.select({ c: sql<number>`count(*)` }).from(operationLogs).where(and(eq(operationLogs.userId, request.authUser!.id), gte(operationLogs.createdAt, todayStart))).then((r) => r[0]?.c || 0),
            hint: '本人提交'
          }
        ];

    const roleDistributionRows = await db.select({ roleName: roles.name, count: sql<number>`count(*)` }).from(users).leftJoin(roles, eq(users.roleId, roles.id)).groupBy(roles.name).orderBy(desc(sql`count(*)`));
    const pendingNotices = await db
      .select()
      .from(notices)
      .orderBy(desc(notices.publishAt), desc(notices.id))
      .limit(5);

    return ok({
      cards,
      roleDistribution: roleDistributionRows,
      pendingNotices: pendingNotices.map((item) => ({
        ...item,
        targetRoleCodes: parseJsonArray(item.targetRoleCodes),
        readCount: myNoticeReads.filter((read) => read.noticeId === item.id).length
      })),
      todayTrend: [
        { label: '08', value: 4 },
        { label: '10', value: 9 },
        { label: '12', value: 11 },
        { label: '14', value: 15 },
        { label: '16', value: 12 },
        { label: '18', value: 8 }
      ]
    });
  });
}
