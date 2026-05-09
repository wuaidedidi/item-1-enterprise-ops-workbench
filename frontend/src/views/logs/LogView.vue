<template>
  <PageBlock title="操作日志审计" desc="记录登录、公告确认、用户维护等关键操作" extra>
    <template #extra>
      <el-tag type="primary">审计留痕</el-tag>
    </template>
    <div class="toolbar">
      <el-input v-model="query.keyword" clearable placeholder="搜索操作消息" @keyup.enter="load" />
      <el-input v-model="query.module" clearable placeholder="模块名称" />
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Search" @click="load">查询</el-button>
      </div>
    </div>
    <el-table v-loading="loading" :data="list" stripe>
      <el-table-column prop="module" label="模块" min-width="120" />
      <el-table-column prop="action" label="动作" min-width="150" />
      <el-table-column prop="userName" label="操作人" min-width="120" />
      <el-table-column prop="method" label="方法" width="100" />
      <el-table-column prop="path" label="路径" min-width="220" show-overflow-tooltip />
      <el-table-column prop="message" label="消息" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><el-tag :type="row.status < 400 ? 'success' : 'danger'">{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column label="时间" width="180">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>
    <div class="table-footer">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @change="load" />
    </div>
  </PageBlock>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import { logApi } from '@/api';
import { formatTime } from '@/utils/format';

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 10, keyword: '', module: '' });

async function load() {
  loading.value = true;
  try {
    const res = await logApi.list(query);
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

onMounted(load);
</script>
