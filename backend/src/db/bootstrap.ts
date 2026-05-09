import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { db, ensureTables, now } from './client.js';
import { auditRecords, departments, menuResources, notices, noticeReads, operationLogs, roles, systemSettings, users } from './schema.js';
import { hashPassword } from '../utils/password.js';

type SeedUser = {
  userName: string;
  realName: string;
  password: string;
  roleCode: string;
  departmentCode: string;
  status?: 'enabled' | 'disabled';
  isAdmin?: boolean;
  phone?: string | null;
  email?: string | null;
};

const menuSeed = [
  { parentId: null, title: '数据看板', path: '/dashboard', icon: 'LayoutDashboard', type: 'menu', permissionCode: 'dashboard:view', component: 'dashboard/index', sort: 1, visible: true, remark: '业务总览' },
  { parentId: null, title: '组织架构', path: '/org', icon: 'Building2', type: 'dir', permissionCode: null, component: null, sort: 2, visible: true, remark: '组织与用户' },
  { parentId: 2, title: '用户账号管理', path: '/users', icon: 'Users', type: 'menu', permissionCode: 'user:view', component: 'users/index', sort: 1, visible: true, remark: '账号与状态管理' },
  { parentId: 2, title: '组织部门管理', path: '/departments', icon: 'Sitemap', type: 'menu', permissionCode: 'department:view', component: 'departments/index', sort: 2, visible: true, remark: '部门配置' },
  { parentId: null, title: '权限中心', path: '/rbac', icon: 'ShieldCheck', type: 'dir', permissionCode: null, component: null, sort: 3, visible: true, remark: '角色与资源' },
  { parentId: 5, title: '角色权限配置', path: '/roles', icon: 'BadgeCheck', type: 'menu', permissionCode: 'role:view', component: 'roles/index', sort: 1, visible: true, remark: '角色分配' },
  { parentId: 5, title: '菜单资源管理', path: '/menus', icon: 'PanelTop', type: 'menu', permissionCode: 'menu:view', component: 'menus/index', sort: 2, visible: true, remark: '菜单与按钮资源' },
  { parentId: null, title: '公告中心', path: '/notices', icon: 'BellRing', type: 'menu', permissionCode: 'notice:view', component: 'notices/index', sort: 4, visible: true, remark: '公告通知与阅读状态' },
  { parentId: null, title: '审计留痕', path: '/logs', icon: 'FileSearch', type: 'menu', permissionCode: 'log:view', component: 'logs/index', sort: 5, visible: true, remark: '操作日志审计' },
  { parentId: null, title: '审计中心', path: '/audits', icon: 'ScanEye', type: 'menu', permissionCode: 'audit:view', component: 'audits/index', sort: 6, visible: true, remark: '权限变更留痕' },
  { parentId: null, title: '系统配置', path: '/settings', icon: 'SlidersHorizontal', type: 'menu', permissionCode: 'setting:view', component: 'settings/index', sort: 7, visible: true, remark: '基础参数配置' },
  { parentId: null, title: '个人中心', path: '/profile', icon: 'UserCog', type: 'menu', permissionCode: 'profile:view', component: 'profile/index', sort: 8, visible: true, remark: '个人资料与密码' }
];

const departmentSeed = [
  { name: '集团总部', code: 'HQ', leaderName: '系统管理员', sort: 1 },
  { name: '运营中心', code: 'OPS', leaderName: '运营主管', sort: 2 },
  { name: '业务部', code: 'BIZ', leaderName: '业务负责人', sort: 3 },
  { name: '审计部', code: 'AUD', leaderName: '审计员', sort: 4 }
];

const roleSeed = [
  {
    name: '系统管理员',
    code: 'admin',
    description: '管理全部组织、权限、菜单与系统参数',
    menuIds: [],
    buttonPermissions: ['user:create', 'user:update', 'user:delete', 'department:create', 'department:update', 'department:delete', 'role:create', 'role:update', 'role:delete', 'role:assign', 'menu:create', 'menu:update', 'menu:delete', 'notice:create', 'notice:update', 'notice:publish', 'setting:update']
  },
  {
    name: '运营主管',
    code: 'ops',
    description: '管理公告发布、业务协同和部分基础配置',
    menuIds: [],
    buttonPermissions: ['user:view', 'department:view', 'notice:view', 'notice:create', 'notice:update', 'notice:publish', 'setting:view', 'profile:view']
  },
  {
    name: '业务人员',
    code: 'biz',
    description: '执行日常业务，查看公告并处理任务',
    menuIds: [],
    buttonPermissions: ['notice:view', 'notice:read', 'profile:view']
  },
  {
    name: '审计员',
    code: 'audit',
    description: '查看操作日志、审计记录与权限变更',
    menuIds: [],
    buttonPermissions: ['log:view', 'audit:view', 'profile:view']
  }
];

const userSeed: SeedUser[] = [
  { userName: 'admin', realName: '系统管理员', password: '123456', roleCode: 'admin', departmentCode: 'HQ', isAdmin: true, phone: '13800000000', email: 'admin@example.com' },
  { userName: 'ops01', realName: '运营主管', password: '123456', roleCode: 'ops', departmentCode: 'OPS', phone: '13800000001', email: 'ops01@example.com' },
  { userName: 'biz01', realName: '业务人员', password: '123456', roleCode: 'biz', departmentCode: 'BIZ', phone: '13800000002', email: 'biz01@example.com' },
  { userName: 'audit01', realName: '审计员', password: '123456', roleCode: 'audit', departmentCode: 'AUD', phone: '13800000003', email: 'audit01@example.com' }
];

const noticeSeed = [
  {
    title: '2026年第二季度运营节奏通知',
    content: '请各业务团队在本周内完成本季度重点项目梳理，并在公告确认后同步负责人计划。审计部将抽查执行留痕。',
    level: 'high',
    targetRoleCodes: ['ops', 'biz']
  },
  {
    title: '权限配置例行检查',
    content: '系统将对近期发生的角色变更与菜单授权进行例行审计，请及时关注审计结果。',
    level: 'normal',
    targetRoleCodes: ['admin', 'audit']
  }
];

const settingsSeed = [
  { settingKey: 'company_name', settingTitle: '企业名称', settingValue: '星链协同科技', description: '系统顶部与公告落款使用的企业名称' },
  { settingKey: 'workbench_theme', settingTitle: '工作台主题', settingValue: 'calm-blue', description: '前端工作台主题配色标识' },
  { settingKey: 'notice_default_level', settingTitle: '公告默认等级', settingValue: 'normal', description: '新增公告的默认等级' }
];

function json(value: unknown) {
  return JSON.stringify(value);
}

async function seedMenus() {
  const exists = await db.select({ c: count() }).from(menuResources);
  if (exists[0]?.c > 0) return;
  const nowTs = now();
  await db.insert(menuResources).values(
    menuSeed.map((item) => ({
      ...item,
      createdAt: nowTs,
      updatedAt: nowTs
    }))
  );
}

async function seedDepartments() {
  const exists = await db.select({ c: count() }).from(departments);
  if (exists[0]?.c > 0) return;
  const nowTs = now();
  await db.insert(departments).values(
    departmentSeed.map((item) => ({
      ...item,
      parentId: null,
      createdAt: nowTs,
      updatedAt: nowTs
    }))
  );
}

async function seedRoles() {
  const exists = await db.select({ c: count() }).from(roles);
  if (exists[0]?.c > 0) return;
  const nowTs = now();
  const menus = await db.select({ id: menuResources.id, title: menuResources.title }).from(menuResources);
  const allMenuIds = menus.map((item) => item.id);
  const byTitle = new Map(menus.map((item) => [item.title, item.id]));
  const roleMenus: Record<string, string[]> = {
    admin: menus.map((item) => item.title),
    ops: ['数据看板', '组织架构', '用户账号管理', '组织部门管理', '公告中心', '系统配置', '个人中心'],
    biz: ['数据看板', '公告中心', '个人中心'],
    audit: ['数据看板', '审计留痕', '审计中心', '个人中心']
  };
  await db.insert(roles).values(
    roleSeed.map((role) => ({
      ...role,
      menuIds: json(role.code === 'admin' ? allMenuIds : (roleMenus[role.code] || []).map((title) => byTitle.get(title)).filter(Boolean)),
      buttonPermissions: json(role.buttonPermissions),
      status: 'enabled',
      isSystem: role.code === 'admin',
      createdAt: nowTs,
      updatedAt: nowTs
    }))
  );
}

async function seedUsers() {
  const departmentsList = await db.select().from(departments);
  const rolesList = await db.select().from(roles);
  const departmentMap = new Map(departmentsList.map((item) => [item.code, item]));
  const roleMap = new Map(rolesList.map((item) => [item.code, item]));
  const nowTs = now();

  for (const seed of userSeed) {
    const role = roleMap.get(seed.roleCode);
    const department = departmentMap.get(seed.departmentCode);
    if (!role || !department) continue;
    const existing = await db.select().from(users).where(eq(users.userName, seed.userName)).limit(1);
    const payload = {
      userName: seed.userName,
      realName: seed.realName,
      passwordHash: hashPassword(seed.password),
      phone: seed.phone || null,
      email: seed.email || null,
      departmentId: department.id,
      roleId: role.id,
      status: seed.status || 'enabled',
      isAdmin: seed.isAdmin || false,
      updatedAt: nowTs
    };
    if (existing.length) {
      await db.update(users).set(payload).where(eq(users.id, existing[0].id));
    } else {
      await db.insert(users).values({
        ...payload,
        createdAt: nowTs
      });
    }
  }
}

async function seedNotices() {
  const exists = await db.select({ c: count() }).from(notices);
  if (exists[0]?.c > 0) return;
  const publisher = await db.select().from(users).where(eq(users.userName, 'admin')).limit(1);
  const nowTs = now();
  if (!publisher.length) return;
  await db.insert(notices).values(
    noticeSeed.map((notice) => ({
      title: notice.title,
      content: notice.content,
      level: notice.level,
      publisherId: publisher[0].id,
      targetRoleCodes: json(notice.targetRoleCodes),
      status: 'published',
      publishAt: nowTs,
      createdAt: nowTs,
      updatedAt: nowTs
    }))
  );
}

async function seedSettings() {
  const exists = await db.select({ c: count() }).from(systemSettings);
  if (exists[0]?.c > 0) return;
  const nowTs = now();
  await db.insert(systemSettings).values(
    settingsSeed.map((item) => ({
      ...item,
      updatedBy: 'system',
      updatedAt: nowTs
    }))
  );
}

async function seedReads() {
  const noticeList = await db.select().from(notices);
  const demoTargets = await db
    .select({
      id: users.id,
      roleCode: roles.code
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(inArray(roles.code, ['biz', 'admin']));
  const nowTs = now();
  for (const notice of noticeList) {
    for (const row of demoTargets) {
      const exists = await db.select({ c: count() }).from(noticeReads).where(and(eq(noticeReads.noticeId, notice.id), eq(noticeReads.userId, row.id)));
      if (exists[0]?.c) continue;
      const targetCodes = JSON.parse(notice.targetRoleCodes || '[]') as string[];
      if (targetCodes.length && row.roleCode && !targetCodes.includes(row.roleCode)) continue;
      await db.insert(noticeReads).values({
        noticeId: notice.id,
        userId: row.id,
        readStatus: row.roleCode === 'biz' ? 'read' : 'unread',
        processedStatus: row.roleCode === 'biz' ? 'done' : 'pending',
        readAt: row.roleCode === 'biz' ? nowTs : null,
        processedAt: row.roleCode === 'biz' ? nowTs : null,
        createdAt: nowTs,
        updatedAt: nowTs
      });
    }
  }
}

async function seedAuditAndLogs() {
  const existingLogs = await db.select({ c: count() }).from(operationLogs);
  if (existingLogs[0]?.c === 0) {
    const nowTs = now();
    await db.insert(operationLogs).values([
      {
        userId: 1,
        userName: 'admin',
        module: '系统',
        action: 'BOOTSTRAP',
        method: 'SYSTEM',
        path: '/bootstrap',
        status: 200,
        message: '初始化系统并写入演示数据',
        ip: '127.0.0.1',
        createdAt: nowTs
      }
    ]);
  }
  const existingAudit = await db.select({ c: count() }).from(auditRecords);
  if (existingAudit[0]?.c === 0) {
    const nowTs = now();
    await db.insert(auditRecords).values([
      {
        actionType: 'ROLE_ASSIGN',
        module: '权限中心',
        entityType: 'roles',
        entityId: 'seed',
        beforeData: null,
        afterData: json({ note: '系统初始化角色与菜单权限' }),
        operatorId: 1,
        operatorName: 'admin',
        result: 'success',
        createdAt: nowTs
      }
    ]);
  }
}

export async function ensureDatabaseAndSeed() {
  await ensureTables();
  await seedMenus();
  await seedDepartments();
  await seedRoles();
  await seedUsers();
  await seedSettings();
  await seedNotices();
  await seedReads();
  await seedAuditAndLogs();
}
