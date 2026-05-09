<template>
  <PageBlock title="用户账号管理" desc="维护账号、组织、角色和启停状态" extra>
    <template #extra>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建用户</el-button>
    </template>
    <div class="toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索用户名、姓名、电话、邮箱" @keyup.enter="load" />
      <el-select v-model="query.status" clearable placeholder="账号状态">
        <el-option label="启用" value="enabled" />
        <el-option label="停用" value="disabled" />
      </el-select>
      <el-select v-model="query.roleId" clearable placeholder="角色">
        <el-option v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" />
      </el-select>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="userName" label="用户名" min-width="130" show-overflow-tooltip />
      <el-table-column prop="realName" label="姓名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="departmentName" label="部门" min-width="140" show-overflow-tooltip />
      <el-table-column prop="roleName" label="角色" min-width="130" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" min-width="140" show-overflow-tooltip />
      <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
      <el-table-column label="最近登录" width="170">
        <template #default="{ row }">{{ formatTime(row.lastLoginAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="showDetail(row)">详情</el-button>
          <el-button text type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button text type="danger" :disabled="row.id === auth.user?.id" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-footer">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="load"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑用户' : '新建用户'" width="720px" align-center destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="用户名" prop="userName">
            <el-input v-model="form.userName" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="姓名" prop="realName">
            <el-input v-model="form.realName" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item v-if="!editing" label="初始密码" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="至少6位" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="选填，填写则需正确格式" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="选填，填写则需正确格式" />
          </el-form-item>
          <el-form-item label="部门" prop="departmentId">
            <el-select v-model="form.departmentId" clearable placeholder="请选择部门">
              <el-option v-for="item in departmentOptions" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="角色" prop="roleId">
            <el-select v-model="form.roleId" placeholder="请选择角色" :disabled="editing && form.id === auth.user?.id">
              <el-option v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="账号状态" prop="status">
            <el-radio-group v-model="form.status" :disabled="editing && form.id === auth.user?.id">
              <el-radio-button label="enabled">启用</el-radio-button>
              <el-radio-button label="disabled">停用</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="用户详情" size="420px">
      <div v-if="detail" class="drawer-detail">
        <div class="detail-row"><span>用户名</span><strong>{{ detail.userName }}</strong></div>
        <div class="detail-row"><span>姓名</span><strong>{{ detail.realName }}</strong></div>
        <div class="detail-row"><span>部门</span><strong>{{ detail.departmentName || '-' }}</strong></div>
        <div class="detail-row"><span>角色</span><strong>{{ detail.roleName || '-' }}</strong></div>
        <div class="detail-row"><span>状态</span><strong>{{ statusText(detail.status) }}</strong></div>
        <div class="detail-row"><span>手机号</span><strong>{{ detail.phone || '-' }}</strong></div>
        <div class="detail-row"><span>邮箱</span><strong>{{ detail.email || '-' }}</strong></div>
        <div class="detail-row"><span>最近登录</span><strong>{{ formatTime(detail.lastLoginAt) }}</strong></div>
      </div>
    </el-drawer>
  </PageBlock>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh, Search } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import { departmentApi, roleApi, userApi } from '@/api';
import { formatTime, statusText, statusType } from '@/utils/format';
import { showSuccess } from '@/utils/message';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const editing = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const roleOptions = ref<any[]>([]);
const departmentOptions = ref<any[]>([]);
const detail = ref<any | null>(null);
const formRef = ref<FormInstance>();

const query = reactive({ page: 1, pageSize: 10, keyword: '', status: '', roleId: '' as any });
const form = reactive<any>({ id: null, userName: '', realName: '', password: '', phone: '', email: '', departmentId: null, roleId: null, status: 'enabled' });

const rules: FormRules = {
  userName: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
  phone: [{ validator: (_, value, cb) => (!value || /^1[3-9]\d{9}$/.test(value) ? cb() : cb(new Error('手机号格式不正确'))), trigger: 'blur' }],
  email: [{ validator: (_, value, cb) => (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? cb() : cb(new Error('邮箱格式不正确'))), trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }]
};

async function loadOptions() {
  const [roles, deps] = await Promise.all([roleApi.options(), departmentApi.list({ page: 1, pageSize: 100 })]);
  roleOptions.value = roles.data;
  departmentOptions.value = deps.data.list;
}

async function load() {
  loading.value = true;
  try {
    const res = await userApi.list(query);
    list.value = res.data.list;
    total.value = res.data.total;
  } finally {
    loading.value = false;
  }
}

function reset() {
  Object.assign(query, { page: 1, pageSize: 10, keyword: '', status: '', roleId: '' });
  load();
}

function openCreate() {
  editing.value = false;
  Object.assign(form, { id: null, userName: '', realName: '', password: '123456', phone: '', email: '', departmentId: null, roleId: roleOptions.value.find((r) => r.code === 'biz')?.value || null, status: 'enabled' });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editing.value = true;
  const role = roleOptions.value.find((r) => r.label === row.roleName || r.code === row.roleCode);
  const dep = departmentOptions.value.find((d) => d.name === row.departmentName || d.code === row.departmentCode);
  Object.assign(form, { id: row.id, userName: row.userName, realName: row.realName, password: '', phone: row.phone || '', email: row.email || '', departmentId: dep?.id || null, roleId: role?.value || null, status: row.status });
  dialogVisible.value = true;
}

function showDetail(row: any) {
  detail.value = row;
  detailVisible.value = true;
}

async function submit() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const payload = { ...form };
    if (editing.value) {
      delete payload.password;
      await userApi.update(form.id, payload);
      showSuccess('用户更新成功');
    } else {
      await userApi.create(payload);
      showSuccess('用户创建成功');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确认删除用户“${row.realName}”？`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  await userApi.remove(row.id);
  showSuccess('用户删除成功');
  await load();
}

onMounted(async () => {
  await loadOptions();
  await load();
});
</script>
