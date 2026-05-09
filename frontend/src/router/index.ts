import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginView from '@/views/auth/LoginView.vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DashboardView from '@/views/dashboard/DashboardView.vue';
import UserView from '@/views/users/UserView.vue';
import DepartmentView from '@/views/departments/DepartmentView.vue';
import RoleView from '@/views/roles/RoleView.vue';
import MenuView from '@/views/menus/MenuView.vue';
import NoticeView from '@/views/notices/NoticeView.vue';
import LogView from '@/views/logs/LogView.vue';
import AuditView from '@/views/audits/AuditView.vue';
import SettingView from '@/views/settings/SettingView.vue';
import ProfileView from '@/views/profile/ProfileView.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginView, meta: { public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: 'dashboard', component: DashboardView, meta: { title: '数据看板' } },
      { path: 'users', component: UserView, meta: { title: '用户账号管理', permission: 'user:view' } },
      { path: 'departments', component: DepartmentView, meta: { title: '组织部门管理', permission: 'department:view' } },
      { path: 'roles', component: RoleView, meta: { title: '角色权限配置', permission: 'role:view' } },
      { path: 'menus', component: MenuView, meta: { title: '菜单资源管理', permission: 'menu:view' } },
      { path: 'notices', component: NoticeView, meta: { title: '公告与通知中心', permission: 'notice:view' } },
      { path: 'logs', component: LogView, meta: { title: '操作日志审计', permission: 'log:view' } },
      { path: 'audits', component: AuditView, meta: { title: '审计记录', permission: 'audit:view' } },
      { path: 'settings', component: SettingView, meta: { title: '系统参数配置', permission: 'setting:view' } },
      { path: 'profile', component: ProfileView, meta: { title: '个人中心', permission: 'profile:view' } }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) await auth.init();
  if (to.meta.public) {
    if (to.path === '/login' && auth.token) return '/dashboard';
    return true;
  }
  if (!auth.token) return '/login';
  const permission = to.meta.permission as string | undefined;
  if (permission && !auth.isAdmin && !auth.permissions.includes(permission)) return '/dashboard';
  return true;
});

export default router;
