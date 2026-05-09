import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const departments = sqliteTable('departments', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id', { mode: 'number' }),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  leaderName: text('leader_name'),
  sort: integer('sort').notNull().default(0),
  status: text('status').notNull().default('enabled'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

export const roles = sqliteTable('roles', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description'),
  status: text('status').notNull().default('enabled'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  menuIds: text('menu_ids').notNull().default('[]'),
  buttonPermissions: text('button_permissions').notNull().default('[]'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

export const users = sqliteTable(
  'users',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userName: text('user_name').notNull().unique(),
    realName: text('real_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    phone: text('phone'),
    email: text('email'),
    departmentId: integer('department_id', { mode: 'number' }).references(() => departments.id, { onDelete: 'set null' }),
    roleId: integer('role_id', { mode: 'number' }).references(() => roles.id, { onDelete: 'restrict' }).notNull(),
    status: text('status').notNull().default('enabled'),
    isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    lastLoginAt: integer('last_login_at', { mode: 'number' }),
    lastLoginIp: text('last_login_ip'),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (table) => ({
    userNameIdx: index('idx_users_user_name').on(table.userName),
    roleIdx: index('idx_users_role_id').on(table.roleId)
  })
);

export const menuResources = sqliteTable('menu_resources', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  parentId: integer('parent_id', { mode: 'number' }),
  title: text('title').notNull(),
  path: text('path').notNull(),
  icon: text('icon'),
  type: text('type').notNull(),
  permissionCode: text('permission_code'),
  component: text('component'),
  sort: integer('sort').notNull().default(0),
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull().default('enabled'),
  remark: text('remark'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

export const notices = sqliteTable('notices', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  level: text('level').notNull().default('normal'),
  publisherId: integer('publisher_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  targetRoleCodes: text('target_role_codes').notNull().default('[]'),
  status: text('status').notNull().default('draft'),
  publishAt: integer('publish_at', { mode: 'number' }),
  expireAt: integer('expire_at', { mode: 'number' }),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

export const noticeReads = sqliteTable(
  'notice_reads',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    noticeId: integer('notice_id', { mode: 'number' }).references(() => notices.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    readStatus: text('read_status').notNull().default('unread'),
    processedStatus: text('processed_status').notNull().default('pending'),
    readAt: integer('read_at', { mode: 'number' }),
    processedAt: integer('processed_at', { mode: 'number' }),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull()
  },
  (table) => ({
    noticeUserIdx: index('idx_notice_reads_notice_user').on(table.noticeId, table.userId)
  })
);

export const operationLogs = sqliteTable('operation_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  userId: integer('user_id', { mode: 'number' }),
  userName: text('user_name'),
  module: text('module').notNull(),
  action: text('action').notNull(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  status: integer('status').notNull().default(200),
  message: text('message').notNull(),
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'number' }).notNull()
});

export const systemSettings = sqliteTable('system_settings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  settingKey: text('setting_key').notNull().unique(),
  settingTitle: text('setting_title').notNull(),
  settingValue: text('setting_value').notNull(),
  description: text('description'),
  updatedBy: text('updated_by'),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
});

export const auditRecords = sqliteTable('audit_records', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  actionType: text('action_type').notNull(),
  module: text('module').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeData: text('before_data'),
  afterData: text('after_data'),
  operatorId: integer('operator_id', { mode: 'number' }),
  operatorName: text('operator_name'),
  result: text('result').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull()
});

export const tables = {
  departments,
  roles,
  users,
  menuResources,
  notices,
  noticeReads,
  operationLogs,
  systemSettings,
  auditRecords
};
