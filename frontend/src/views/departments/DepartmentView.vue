<template>
  <PageBlock title="组织部门管理" desc="维护企业组织结构、负责人和部门状态" extra>
    <template #extra>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建部门</el-button>
    </template>
    <div class="toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索部门名称或编码" @keyup.enter="load" />
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="name" label="部门名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="code" label="部门编码" min-width="140" />
      <el-table-column prop="leaderName" label="负责人" min-width="140" show-overflow-tooltip />
      <el-table-column prop="sort" label="排序" width="90" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
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

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑部门' : '新建部门'" width="620px" align-center destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="部门名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入部门名称" />
          </el-form-item>
          <el-form-item label="部门编码" prop="code">
            <el-input v-model="form.code" placeholder="请输入部门编码" />
          </el-form-item>
          <el-form-item label="负责人" prop="leaderName">
            <el-input v-model="form.leaderName" placeholder="请输入负责人" />
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
import { departmentApi } from '@/api';
import { formatTime, statusText, statusType } from '@/utils/format';
import { showSuccess } from '@/utils/message';

const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editing = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const formRef = ref<FormInstance>();
const query = reactive({ page: 1, pageSize: 10, keyword: '' });
const form = reactive<any>({ id: null, name: '', code: '', leaderName: '', sort: 0, status: 'enabled' });
const rules: FormRules = {
  name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入部门编码', trigger: 'blur' }]
};

async function load() {
  loading.value = true;
  try {
    const res = await departmentApi.list(query);
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
  Object.assign(form, { id: null, name: '', code: '', leaderName: '', sort: 0, status: 'enabled' });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editing.value = true;
  Object.assign(form, row);
  dialogVisible.value = true;
}

async function submit() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    if (editing.value) {
      await departmentApi.update(form.id, form);
      showSuccess('部门更新成功');
    } else {
      await departmentApi.create(form);
      showSuccess('部门创建成功');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确认删除部门“${row.name}”？`, '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  await departmentApi.remove(row.id);
  showSuccess('部门删除成功');
  await load();
}

onMounted(load);
</script>
