import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { db, now } from '../db/client.js';
import { auditRecords, departments, menuResources, notices, noticeReads, operationLogs, roles, users, systemSettings } from '../db/schema.js';
import { parseJsonArray, stringifyJson } from '../utils/json.js';

export function buildPage(page: number, pageSize: number, total: number, list: unknown[]) {
  return {
    list,
    page,
    pageSize,
    total
  };
}

export async function findUserById(userId: number) {
  const rows = await db
    .select({
      id: users.id,
      userName: users.userName,
      realName: users.realName,
      phone: users.phone,
      email: users.email,
      departmentId: users.departmentId,
      roleId: users.roleId,
      status: users.status,
      isAdmin: users.isAdmin,
      lastLoginAt: users.lastLoginAt,
      lastLoginIp: users.lastLoginIp,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      roleName: roles.name,
      roleCode: roles.code,
      roleDescription: roles.description,
      roleMenuIds: roles.menuIds,
      buttonPermissions: roles.buttonPermissions,
      departmentName: departments.name,
      departmentCode: departments.code
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] || null;
}

export async function buildCurrentUser(userId: number) {
  const row = await findUserById(userId);
  if (!row || !row.roleCode) return null;
  const menuIds = parseJsonArray(row.roleMenuIds as string | null);
  const buttonPermissions = parseJsonArray(row.buttonPermissions as string | null);
  const menuRows = await db.select().from(menuResources).where(inArray(menuResources.id, menuIds.length ? menuIds : [0])).orderBy(asc(menuResources.sort), asc(menuResources.id));
  const visibleMenus = menuRows.filter((item) => item.status === 'enabled' && item.visible && item.type !== 'button');
  const buildTree = (parentId: number | null = null): any[] =>
    visibleMenus
      .filter((item) => (item.parentId ?? null) === parentId)
      .sort((a, b) => a.sort - b.sort || a.id - b.id)
      .map((item) => ({ ...item, children: buildTree(item.id) }));
  return {
    id: row.id,
    userName: row.userName,
    realName: row.realName,
    phone: row.phone,
    email: row.email,
    status: row.status,
    isAdmin: !!row.isAdmin,
    lastLoginAt: row.lastLoginAt,
    lastLoginIp: row.lastLoginIp,
    department: row.departmentName
      ? { id: row.departmentId, name: row.departmentName, code: row.departmentCode }
      : null,
    role: {
      id: row.roleId,
      name: row.roleName,
      code: row.roleCode,
      description: row.roleDescription
    },
    menuIds,
    permissions: buttonPermissions,
    menus: buildTree()
  };
}

export async function writeOperationLog(input: {
  userId?: number | null;
  userName?: string | null;
  module: string;
  action: string;
  method: string;
  path: string;
  status: number;
  message: string;
  ip?: string | null;
}) {
  await db.insert(operationLogs).values({
    userId: input.userId || null,
    userName: input.userName || null,
    module: input.module,
    action: input.action,
    method: input.method,
    path: input.path,
    status: input.status,
    message: input.message,
    ip: input.ip || null,
    createdAt: now()
  });
}

export async function writeAuditRecord(input: {
  actionType: string;
  module: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  operatorId?: number | null;
  operatorName?: string | null;
  result: string;
}) {
  await db.insert(auditRecords).values({
    actionType: input.actionType,
    module: input.module,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeData: input.beforeData ? stringifyJson(input.beforeData) : null,
    afterData: input.afterData ? stringifyJson(input.afterData) : null,
    operatorId: input.operatorId || null,
    operatorName: input.operatorName || null,
    result: input.result,
    createdAt: now()
  });
}

export function hasPermission(userPermissions: string[] | undefined, required?: string | null) {
  if (!required) return true;
  return !!userPermissions?.includes(required);
}

export function toLike(keyword?: string) {
  const value = (keyword || '').trim();
  return value ? `%${value}%` : '%';
}

export function safeRoleCodes(value: string | null | undefined) {
  return parseJsonArray(value).filter((item): item is string => typeof item === 'string');
}

export function summarizeNoticeReadStatus(reads: Array<{ readStatus: string; processedStatus: string }>) {
  const total = reads.length;
  const readCount = reads.filter((item) => item.readStatus === 'read' || item.processedStatus === 'done').length;
  const processedCount = reads.filter((item) => item.processedStatus === 'done').length;
  return { total, readCount, processedCount };
}

export async function getSettingMap() {
  const rows = await db.select().from(systemSettings);
  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.settingKey] = row.settingValue;
    return acc;
  }, {});
}
