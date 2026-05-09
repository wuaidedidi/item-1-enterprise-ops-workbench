import { defineStore } from 'pinia';
import { authApi } from '@/api';
import { storage } from '@/utils/storage';

type AuthUser = {
  id: number;
  userName: string;
  realName: string;
  status: string;
  isAdmin: boolean;
  role: { id: number; name: string; code: string };
  permissions: string[];
  menus: Array<any>;
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: storage.token,
    user: storage.user as AuthUser | null,
    ready: false
  }),
  getters: {
    permissions: (state) => state.user?.permissions || [],
    menus: (state) => state.user?.menus || [],
    roleCode: (state) => state.user?.role?.code || '',
    isAdmin: (state) => !!state.user?.isAdmin
  },
  actions: {
    setSession(token: string, user: AuthUser) {
      this.token = token;
      this.user = user;
      storage.token = token;
      storage.user = user;
    },
    clearSession() {
      this.token = '';
      this.user = null;
      storage.token = '';
      storage.user = null;
    },
    async fetchMe() {
      if (!this.token) return null;
      const res = await authApi.me();
      this.user = res.data;
      storage.user = res.data;
      return res.data;
    },
    async init() {
      if (this.token && !this.user) {
        try {
          await this.fetchMe();
        } catch {
          this.clearSession();
        }
      }
      this.ready = true;
    }
  }
});
