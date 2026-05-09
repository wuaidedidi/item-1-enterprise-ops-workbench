<template>
  <PageBlock title="审计记录" desc="查看权限、组织、公告和参数变更记录" extra>
    <template #extra>
      <el-tag type="warning">变更追踪</el-tag>
    </template>
    <div class="toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索实体类型" @keyup.enter="load" />
      <el-input v-model="query.module" clearable placeholder="模块名称" />
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="module" label="模块" min-width="120" />
      <el-table-column prop="actionType" label="变更类型" min-width="160" />
      <el-table-column prop="entityType" label="实体" min-width="130" />
      <el-table-column prop="entityId" label="实体编号" min-width="150" show-overflow-tooltip />
      <el-table-column prop="operatorName" label="操作人" min-width="120" />
      <el-table-column prop="result" label="结果" width="100" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="showDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-footer">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" />
    </div>
    <el-drawer v-model="detailVisible" title="审计详情" size="520px">
      <div v-if="detail" class="drawer-detail">
        <div class="detail-row"><span>变更类型</span><strong>{{ detail.actionType }}</strong></div>
        <div class="detail-row"><span>模块</span><strong>{{ detail.module }}</strong></div>
        <div class="detail-row"><span>实体</span><strong>{{ detail.entityType }} / {{ detail.entityId }}</strong></div>
        <div class="detail-row"><span>操作人</span><strong>{{ detail.operatorName || '-' }}</strong></div>
        <pre class="audit-json">{{ detail.afterData || detail.beforeData || '-' }}</pre>
      </div>
    </el-drawer>
  </PageBlock>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import { auditApi } from '@/api';
import { formatTime } from '@/utils/format';

const loading = ref(false);
const detailVisible = ref(false);
const detail = ref<any>(null);
const list = ref<any[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 10, keyword: '', module: '' });

async function load() {
  loading.value = true;
  try {
    const res = await auditApi.list(query);
    list.value = res.data.list;
    total.value = res.data.total;
  } finally {
    loading.value = false;
  }
}

function reset() {
  Object.assign(query, { page: 1, pageSize: 10, keyword: '', module: '' });
  load();
}

function showDetail(row: any) {
  detail.value = row;
  detailVisible.value = true;
}

onMounted(load);
</script>

<style scoped>
.audit-json {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 14px;
  border-radius: 12px;
  background: #f7fafc;
  color: #26384d;
}
</style>
