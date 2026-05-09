<template>
  <PageBlock title="系统参数配置" desc="维护企业名称、公告默认等级和工作台参数" extra>
    <template #extra>
      <el-button :icon="Refresh" @click="load">刷新</el-button>
    </template>
    <div class="settings-grid" v-loading="loading">
      <div v-for="item in list" :key="item.settingKey" class="setting-card">
        <div class="setting-card__head">
          <div>
            <h4>{{ item.settingTitle }}</h4>
            <p>{{ item.description }}</p>
          </div>
          <el-tag>{{ item.settingKey }}</el-tag>
        </div>
        <el-input v-model="item.settingValue" placeholder="请输入参数值" />
        <div class="setting-card__foot">
          <span>更新人：{{ item.updatedBy || '-' }}</span>
          <el-button type="primary" :loading="savingKey === item.settingKey" @click="save(item)">保存</el-button>
        </div>
      </div>
    </div>
  </PageBlock>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import { settingApi } from '@/api';
import { showSuccess } from '@/utils/message';

const loading = ref(false);
const savingKey = ref('');
const list = ref<any[]>([]);

async function load() {
  loading.value = true;
  try {
    const res = await settingApi.list();
    list.value = res.data;
  } finally {
    loading.value = false;
  }
}

async function save(item: any) {
  savingKey.value = item.settingKey;
  try {
    await settingApi.update(item.settingKey, { settingValue: item.settingValue });
    showSuccess('参数保存成功');
    await load();
  } finally {
    savingKey.value = '';
  }
}

onMounted(load);
</script>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.setting-card {
  border: 1px solid #e2ebf5;
  border-radius: 14px;
  padding: 18px;
  background: linear-gradient(180deg, #fff, #f8fbff);
}

.setting-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.setting-card h4 {
  margin: 0;
  color: #13243a;
}

.setting-card p {
  margin: 8px 0 0;
  min-height: 40px;
  color: #708098;
  line-height: 1.6;
  font-size: 13px;
}

.setting-card__foot {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #7a8798;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
