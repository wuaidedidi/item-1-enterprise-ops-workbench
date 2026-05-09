<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="brand">
        <div class="brand-mark">EO</div>
        <div>
          <div class="brand-name">企业运营工作台</div>
          <div class="brand-sub">权限中心 · 公告协同 · 审计留痕</div>
        </div>
      </div>
      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="activePath"
          class="side-menu"
          router
          :collapse="false"
          :unique-opened="true"
          background-color="transparent"
          text-color="rgba(233,242,255,.82)"
          active-text-color="#ffffff"
        >
          <template v-for="item in menuTree" :key="item.id">
            <el-sub-menu v-if="item.children?.length" :index="item.path || String(item.id)">
              <template #title>
                <el-icon><component :is="resolveIcon(item.icon)" /></el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.id" :index="child.path">
                <el-icon><component :is="resolveIcon(child.icon)" /></el-icon>
                <span>{{ child.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.path">
              <el-icon><component :is="resolveIcon(item.icon)" /></el-icon>
              <span>{{ item.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-scrollbar>
    </aside>
    <main class="app-main">
      <header class="topbar">
        <div class="crumbs">
          <span class="page-title">{{ pageTitle }}</span>
          <span class="page-sub">{{ pageHint }}</span>
        </div>
        <div class="top-actions">
          <el-button text :icon="RefreshRight" @click="refreshPage">刷新</el-button>
          <el-dropdown trigger="click">
            <span class="user-chip">
              <el-avatar :size="32" class="avatar">{{ initials }}</el-avatar>
              <span class="user-text">
                <strong>{{ auth.user?.realName }}</strong>
                <small>{{ auth.user?.role?.name }}</small>
              </span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="go('/profile')">个人中心</el-dropdown-item>
                <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <section class="content-wrap">
        <router-view :key="route.fullPath" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowDown, RefreshRight, DataAnalysis, Bell, Files, Setting, Memo, User, Avatar, UserFilled, Grid, OfficeBuilding, Opportunity } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api';
import { showSuccess } from '@/utils/message';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const iconMap: Record<string, any> = {
  LayoutDashboard: DataAnalysis,
  Building2: OfficeBuilding,
  Users: User,
  Sitemap: Grid,
  ShieldCheck: Opportunity,
  BadgeCheck: Memo,
  PanelTop: Files,
  BellRing: Bell,
  FileSearch: Files,
  ScanEye: Avatar,
  SlidersHorizontal: Setting,
  UserCog: UserFilled
};

const menuTree = computed(() => auth.menus || []);
const activePath = computed(() => route.path);
const pageTitle = computed(() => (route.meta.title as string) || '企业运营工作台');
const pageHint = computed(() => {
  if (route.path === '/dashboard') return '围绕组织、权限、公告与审计形成统一运营视图';
  if (route.path === '/profile') return '维护个人资料、联系方式和登录密码';
  return '管理后台业务配置与协同事项';
});
const initials = computed(() => (auth.user?.realName || 'U').slice(0, 1));

function resolveIcon(icon?: string) {
  return iconMap[icon || ''] || DataAnalysis;
}

function go(path: string) {
  router.push(path);
}

async function logout() {
  try {
    await authApi.logout();
  } finally {
    auth.clearSession();
    showSuccess('已退出登录');
    router.replace('/login');
  }
}

function refreshPage() {
  window.location.reload();
}
</script>
