import { http } from './http';

export const authApi = {
  login: (data: { userName: string; password: string }) => http.post('/auth/login', data),
  register: (data: { userName: string; realName: string; password: string; phone?: string; email?: string }) => http.post('/auth/register', data),
  me: () => http.get('/auth/me'),
  logout: () => http.post('/auth/logout')
};

export const dashboardApi = {
  summary: () => http.get('/dashboard/summary')
};

export const userApi = {
  list: (params: any) => http.get('/users', { params }),
  create: (data: any) => http.post('/users', data),
  update: (id: number, data: any) => http.put(`/users/${id}`, data),
  remove: (id: number) => http.delete(`/users/${id}`),
  options: () => http.get('/users/options')
};

export const departmentApi = {
  list: (params: any) => http.get('/departments', { params }),
  create: (data: any) => http.post('/departments', data),
  update: (id: number, data: any) => http.put(`/departments/${id}`, data),
  remove: (id: number) => http.delete(`/departments/${id}`)
};

export const roleApi = {
  list: (params: any) => http.get('/roles', { params }),
  create: (data: any) => http.post('/roles', data),
  update: (id: number, data: any) => http.put(`/roles/${id}`, data),
  remove: (id: number) => http.delete(`/roles/${id}`),
  options: () => http.get('/roles/options')
};

export const menuApi = {
  list: (params: any) => http.get('/menus', { params }),
  tree: () => http.get('/menus/tree'),
  create: (data: any) => http.post('/menus', data),
  update: (id: number, data: any) => http.put(`/menus/${id}`, data),
  remove: (id: number) => http.delete(`/menus/${id}`)
};

export const noticeApi = {
  list: (params: any) => http.get('/notices', { params }),
  detail: (id: number) => http.get(`/notices/${id}`),
  create: (data: any) => http.post('/notices', data),
  update: (id: number, data: any) => http.put(`/notices/${id}`, data),
  publish: (id: number) => http.post(`/notices/${id}/publish`),
  read: (id: number) => http.post(`/notices/${id}/read`)
};

export const logApi = {
  list: (params: any) => http.get('/logs/operations', { params })
};

export const auditApi = {
  list: (params: any) => http.get('/audits', { params })
};

export const settingApi = {
  list: () => http.get('/settings'),
  update: (key: string, data: any) => http.put(`/settings/${key}`, data)
};

export const profileApi = {
  me: () => http.get('/profile/me'),
  update: (data: any) => http.put('/profile/me', data),
  password: (data: any) => http.put('/profile/password', data)
};
