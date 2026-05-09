<template>
  <PageBlock title="菜单资源管理" desc="维护导航、菜单项和权限标识" extra>
    <template #extra>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建资源</el-button>
    </template>
    <div class="toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索菜单名称" @keyup.enter="load" />
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="title" label="资源名称" min-width="170" show-overflow-tooltip />
      <el-table-column prop="path" label="路由路径" min-width="170" show-overflow-tooltip />
      <el-table-column prop="permissionCode" label="权限标识" min-width="170" show-overflow-tooltip />
      <el-table-column label="类型" width="100">
        <template #default="{ row }"><el-tag>{{ typeText(row.type) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="显示" width="90">
        <template #default="{ row }"><el-tag :type="row.visible ? 'success' : 'info'">{{ row.visible ? '显示' : '隐藏' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button text type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-footer">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" />
    </div>
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑菜单资源' : '新建菜单资源'" width="700px" align-center destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="资源名称" prop="title">
            <el-input v-model="form.title" placeholder="请输入资源名称" />
          </el-form-item>
          <el-form-item label="资源类型" prop="type">
            <el-select v-model="form.type" placeholder="请选择类型">
              <el-option label="目录" value="dir" />
              <el-option label="菜单" value="menu" />
              <el-option label="按钮" value="button" />
            </el-select>
          </el-form-item>
          <el-form-item label="路由路径" prop="path">
            <el-input v-model="form.path" placeholder="/dashboard" />
          </el-form-item>
          <el-form-item label="图标名称" prop="icon">
            <el-input v-model="form.icon" placeholder="如 LayoutDashboard" />
          </el-form-item>
          <el-form-item label="权限标识" prop="permissionCode">
            <el-input v-model="form.permissionCode" placeholder="如 user:view" />
          </el-form-item>
          <el-form-item label="组件路径" prop="component">
            <el-input v-model="form.component" placeholder="如 users/index" />
          </el-form-item>
          <el-form-item label="排序" prop="sort">
            <el-input-number v-model="form.sort" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio-button label="enabled">启用</el-radio-button>
              <el-radio-button label="disabled">停用</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="是否显示" prop="visible">
            <el-switch v-model="form.visible" active-text="显示" inactive-text="隐藏" />
          </el-form-item>
          <el-form-item label="备注" prop="remark" class="span-full">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
          </el-form-item>
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
import { onMounted, reactive, ref } from 'vue';
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh, Search } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import { menuApi } from '@/api';
import { statusText, statusType } from '@/utils/format';
import { showSuccess } from '@/utils/message';

const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editing = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const formRef = ref<FormInstance>();
const query = reactive({ page: 1, pageSize: 10, keyword: '' });
const form = reactive<any>({ id: null, title: '', path: '', icon: '', type: 'menu', permissionCode: '', component: '', sort: 0, visible: true, status: 'enabled', remark: '' });
const rules: FormRules = {
  title: [{ required: true, message: '请输入资源名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入路由路径', trigger: 'blur' }],
  type: [{ required: true, message: '请选择资源类型', trigger: 'change' }]
};

function typeText(type: string) {
  return { dir: '目录', menu: '菜单', button: '按钮' }[type] || type;
}

async function load() {
  loading.value = true;
  try {
    const res = await menuApi.list(query);
    list.value = res.data.list;
    total.value = res.data.total;
  } finally {
    loading.value = false;
  }
}

function reset() {
  Object.assign(query, { page: 1, pageSize: 10, keyword: '' });
  load();
}

function openCreate() {
  editing.value = false;
  Object.assign(form, { id: null, title: '', path: '', icon: '', type: 'menu', permissionCode: '', component: '', sort: 0, visible: true, status: 'enabled', remark: '' });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editing.value = true;
  Object.assign(form, row);
  form.visible = !!row.visible;
  dialogVisible.value = true;
}

async function submit() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (editing.value) {
      await menuApi.update(form.id, form);
      showSuccess('菜单资源更新成功');
    } else {
      await menuApi.create(form);
      showSuccess('菜单资源创建成功');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确认删除菜单“${row.title}”？`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  await menuApi.remove(row.id);
  showSuccess('菜单删除成功');
  await load();
}

onMounted(load);
</script>
