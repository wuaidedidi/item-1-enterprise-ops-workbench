<template>
  <PageBlock title="公告与通知中心" desc="发布公告、跟踪阅读和处理状态" extra>
    <template #extra>
      <el-button v-if="canPublish" type="primary" :icon="Plus" @click="openCreate">新建公告</el-button>
    </template>
    <div class="toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索公告标题" @keyup.enter="load" />
      <el-select v-model="query.status" clearable placeholder="发布状态">
        <el-option label="草稿" value="draft" />
        <el-option label="已发布" value="published" />
      </el-select>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="title" label="公告标题" min-width="240" show-overflow-tooltip />
      <el-table-column prop="publisherName" label="发布人" min-width="120" />
      <el-table-column label="等级" width="100">
        <template #default="{ row }"><el-tag :type="statusType(row.level)">{{ statusText(row.level) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="阅读状态" width="110">
        <template #default="{ row }"><el-tag :type="statusType(row.readStatus)">{{ statusText(row.readStatus) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="处理状态" width="110">
        <template #default="{ row }"><el-tag :type="statusType(row.processedStatus)">{{ statusText(row.processedStatus) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="发布时间" width="180">
        <template #default="{ row }">{{ formatTime(row.publishAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="showDetail(row)">详情</el-button>
          <el-button v-if="canPublish" text type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canPublish && row.status !== 'published'" text type="success" @click="publish(row)">发布</el-button>
          <el-button text type="success" :disabled="row.processedStatus === 'done'" @click="markRead(row)">确认阅读</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-footer">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" />
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑公告' : '新建公告'" width="760px" align-center destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="公告标题" prop="title" class="span-full">
            <el-input v-model="form.title" placeholder="请输入公告标题" />
          </el-form-item>
          <el-form-item label="公告等级" prop="level">
            <el-select v-model="form.level" placeholder="请选择公告等级">
              <el-option label="普通" value="low" />
              <el-option label="常规" value="normal" />
              <el-option label="重要" value="high" />
            </el-select>
          </el-form-item>
          <el-form-item label="发布状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio-button label="draft">草稿</el-radio-button>
              <el-radio-button label="published">发布</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="目标角色" prop="targetRoleCodes" class="span-full">
            <el-select v-model="form.targetRoleCodes" multiple collapse-tags collapse-tags-tooltip placeholder="不选则面向全部角色">
              <el-option label="系统管理员" value="admin" />
              <el-option label="运营主管" value="ops" />
              <el-option label="业务人员" value="biz" />
              <el-option label="审计员" value="audit" />
            </el-select>
          </el-form-item>
          <el-form-item label="公告内容" prop="content" class="span-full">
            <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入公告内容" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="公告详情" size="520px">
      <div v-if="detail" class="drawer-detail">
        <div class="detail-row"><span>标题</span><strong>{{ detail.title }}</strong></div>
        <div class="detail-row"><span>等级</span><strong>{{ statusText(detail.level) }}</strong></div>
        <div class="detail-row"><span>发布人</span><strong>{{ detail.publisherName || '-' }}</strong></div>
        <div class="detail-row"><span>发布时间</span><strong>{{ formatTime(detail.publishAt) }}</strong></div>
        <div class="detail-row"><span>阅读状态</span><strong>{{ statusText(detail.readStatus) }}</strong></div>
        <div class="notice-content">{{ detail.content }}</div>
      </div>
    </el-drawer>
  </PageBlock>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh, Search } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import { noticeApi } from '@/api';
import { formatTime, statusText, statusType } from '@/utils/format';
import { showSuccess } from '@/utils/message';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const canPublish = computed(() => auth.isAdmin || auth.permissions.includes('notice:create') || auth.permissions.includes('notice:publish'));
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const editing = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const detail = ref<any>(null);
const formRef = ref<FormInstance>();
const query = reactive({ page: 1, pageSize: 10, keyword: '', status: '' });
const form = reactive<any>({ id: null, title: '', content: '', level: 'normal', status: 'draft', targetRoleCodes: [] });
const rules: FormRules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
};

async function load() {
  loading.value = true;
  try {
    const res = await noticeApi.list(query);
    list.value = res.data.list;
    total.value = res.data.total;
  } finally {
    loading.value = false;
  }
}

function reset() {
  Object.assign(query, { page: 1, pageSize: 10, keyword: '', status: '' });
  load();
}

function openCreate() {
  editing.value = false;
  Object.assign(form, { id: null, title: '', content: '', level: 'normal', status: 'draft', targetRoleCodes: [] });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editing.value = true;
  Object.assign(form, { id: row.id, title: row.title, content: row.content, level: row.level, status: row.status, targetRoleCodes: row.targetRoleCodes || [] });
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
    if (editing.value) {
      await noticeApi.update(form.id, form);
      showSuccess('公告更新成功');
    } else {
      await noticeApi.create(form);
      showSuccess('公告创建成功');
    }
    dialogVisible.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function publish(row: any) {
  await noticeApi.publish(row.id);
  showSuccess('公告已发布');
  await load();
}

async function markRead(row: any) {
  await noticeApi.read(row.id);
  showSuccess('已确认阅读');
  await load();
}

onMounted(load);
</script>

<style scoped>
.notice-content {
  white-space: pre-wrap;
  line-height: 1.8;
  padding: 16px;
  border-radius: 12px;
  color: #26384d;
  background: #f7fafc;
}
</style>
