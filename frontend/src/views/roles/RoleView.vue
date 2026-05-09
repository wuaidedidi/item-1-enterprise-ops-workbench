<template>
  <PageBlock title="角色权限配置" desc="为不同岗位分配菜单资源与按钮权限" extra>
    <template #extra>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建角色</el-button>
    </template>
    <div class="toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索角色名称或编码" @keyup.enter="load" />
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="角色名称" min-width="150" />
      <el-table-column prop="code" label="角色编码" min-width="130" />
      <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
      <el-table-column label="菜单数" width="100">
        <template #default="{ row }">{{ row.menuIds?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="按钮权限" width="110">
        <template #default="{ row }">{{ row.buttonPermissions?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="openEdit(row)">配置</el-button>
          <el-button text type="danger" :disabled="row.isSystem" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-footer">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" />
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '配置角色权限' : '新建角色'" width="780px" align-center destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="角色名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入角色名称" />
          </el-form-item>
          <el-form-item label="角色编码" prop="code">
            <el-input v-model="form.code" :disabled="form.isSystem" placeholder="请输入角色编码" />
          </el-form-item>
          <el-form-item label="角色说明" prop="description" class="span-full">
            <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入角色说明" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio-button label="enabled">启用</el-radio-button>
              <el-radio-button label="disabled">停用</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>
        <div class="permission-grid">
          <div class="permission-panel">
            <div class="permission-title">菜单资源</div>
            <el-tree
              ref="treeRef"
              :data="menuTree"
              node-key="id"
              show-checkbox
              default-expand-all
              :props="{ label: 'title', children: 'children' }"
            />
          </div>
          <div class="permission-panel">
            <div class="permission-title">按钮权限</div>
            <el-checkbox-group v-model="form.buttonPermissions" class="permission-checks">
              <el-checkbox v-for="item in buttonOptions" :key="item.value" :label="item.value">{{ item.label }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </PageBlock>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue';
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh, Search } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import { menuApi, roleApi } from '@/api';
import { statusText, statusType } from '@/utils/format';
import { showSuccess } from '@/utils/message';

const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editing = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const menuTree = ref<any[]>([]);
const treeRef = ref<any>();
const formRef = ref<FormInstance>();
const query = reactive({ page: 1, pageSize: 10, keyword: '' });
const form = reactive<any>({ id: null, name: '', code: '', description: '', status: 'enabled', menuIds: [], buttonPermissions: [], isSystem: false });

const buttonOptions = [
  { label: '用户新增', value: 'user:create' },
  { label: '用户编辑', value: 'user:update' },
  { label: '用户删除', value: 'user:delete' },
  { label: '部门新增', value: 'department:create' },
  { label: '部门编辑', value: 'department:update' },
  { label: '部门删除', value: 'department:delete' },
  { label: '角色新增', value: 'role:create' },
  { label: '角色编辑', value: 'role:update' },
  { label: '角色删除', value: 'role:delete' },
  { label: '菜单新增', value: 'menu:create' },
  { label: '菜单编辑', value: 'menu:update' },
  { label: '菜单删除', value: 'menu:delete' },
  { label: '公告新建', value: 'notice:create' },
  { label: '公告编辑', value: 'notice:update' },
  { label: '公告发布', value: 'notice:publish' },
  { label: '系统参数编辑', value: 'setting:update' }
];

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
};

async function load() {
  loading.value = true;
  try {
    const res = await roleApi.list(query);
    list.value = res.data.list;
    total.value = res.data.total;
  } finally {
    loading.value = false;
  }
}

async function loadMenus() {
  const res = await menuApi.tree();
  menuTree.value = res.data;
}

function reset() {
  Object.assign(query, { page: 1, pageSize: 10, keyword: '' });
  load();
}

async function openCreate() {
  editing.value = false;
  Object.assign(form, { id: null, name: '', code: '', description: '', status: 'enabled', menuIds: [], buttonPermissions: [], isSystem: false });
  dialogVisible.value = true;
  await nextTick();
  treeRef.value?.setCheckedKeys([]);
}

async function openEdit(row: any) {
  editing.value = true;
  Object.assign(form, { ...row, buttonPermissions: row.buttonPermissions || [] });
  dialogVisible.value = true;
  await nextTick();
  treeRef.value?.setCheckedKeys(row.menuIds || []);
}

async function submit() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const payload = { ...form, menuIds: treeRef.value?.getCheckedKeys(false) || [] };
    if (editing.value) {
      await roleApi.update(form.id, payload);
      showSuccess('角色权限保存成功');
    } else {
      await roleApi.create(payload);
      showSuccess('角色创建成功');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确认删除角色“${row.name}”？`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  await roleApi.remove(row.id);
  showSuccess('角色删除成功');
  await load();
}

onMounted(async () => {
  await Promise.all([loadMenus(), load()]);
});
</script>

<style scoped>
.permission-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.9fr);
  gap: 16px;
}

.permission-panel {
  border: 1px solid #e2ebf5;
  border-radius: 12px;
  padding: 14px;
  background: #f8fbff;
  min-height: 260px;
}

.permission-title {
  font-weight: 700;
  margin-bottom: 12px;
  color: #1c2d42;
}

.permission-checks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;
}
</style>
