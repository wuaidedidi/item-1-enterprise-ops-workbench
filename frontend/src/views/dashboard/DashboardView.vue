<template>
  <div class="page-grid">
    <div class="metric-grid">
      <MetricCard v-for="card in cards" :key="card.label" :label="card.label" :value="card.value" :hint="card.hint" />
    </div>

    <div class="dashboard-grid">
      <PageBlock title="今日操作趋势" desc="根据后台操作日志汇总展示" extra>
        <template #extra>
          <el-tag type="primary">实时同步</el-tag>
        </template>
        <div class="trend-chart">
          <div v-for="item in trend" :key="item.label" class="trend-item">
            <div class="trend-bar" :style="{ height: `${Math.max(18, item.value * 8)}px` }"></div>
            <span>{{ item.label }}时</span>
          </div>
        </div>
      </PageBlock>

      <PageBlock title="角色分布" desc="当前系统账号所属角色结构">
        <div class="role-bars">
          <div v-for="item in roleDistribution" :key="item.roleName" class="role-bar">
            <div class="role-bar__label">
              <span>{{ item.roleName || '未分配' }}</span>
              <strong>{{ item.count }}</strong>
            </div>
            <el-progress :percentage="calcPercent(item.count)" :stroke-width="10" :show-text="false" />
          </div>
        </div>
      </PageBlock>
    </div>

    <PageBlock title="近期公告" desc="展示与当前角色相关的公告与协同事项" extra>
      <template #extra>
        <el-button type="primary" :icon="Bell" @click="$router.push('/notices')">进入公告中心</el-button>
      </template>
      <el-table :data="pendingNotices" stripe>
        <el-table-column prop="title" label="公告标题" min-width="240" show-overflow-tooltip />
        <el-table-column label="等级" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.level)">{{ statusText(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">{{ formatTime(row.publishAt) }}</template>
        </el-table-column>
      </el-table>
    </PageBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Bell } from '@element-plus/icons-vue';
import PageBlock from '@/components/PageBlock.vue';
import MetricCard from '@/components/MetricCard.vue';
import { dashboardApi } from '@/api';
import { formatTime, statusText, statusType } from '@/utils/format';

const cards = ref<any[]>([]);
const roleDistribution = ref<any[]>([]);
const pendingNotices = ref<any[]>([]);
const trend = ref<any[]>([]);

const totalRoles = computed(() => roleDistribution.value.reduce((sum, item) => sum + Number(item.count || 0), 0));

function calcPercent(value: number) {
  return totalRoles.value ? Math.round((Number(value || 0) / totalRoles.value) * 100) : 0;
}

async function load() {
  const res = await dashboardApi.summary();
  cards.value = res.data.cards || [];
  roleDistribution.value = res.data.roleDistribution || [];
  pendingNotices.value = res.data.pendingNotices || [];
  trend.value = res.data.todayTrend || [];
}

onMounted(load);
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 18px;
}

.trend-chart {
  min-height: 260px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: end;
  gap: 16px;
  padding: 26px 12px 6px;
}

.trend-item {
  display: grid;
  justify-items: center;
  gap: 10px;
  color: #6e7d92;
  font-size: 13px;
}

.trend-bar {
  width: min(52px, 68%);
  min-height: 18px;
  border-radius: 12px 12px 4px 4px;
  background: linear-gradient(180deg, #2c75b8, #8bd4cb);
  box-shadow: 0 12px 22px rgba(38, 112, 171, 0.22);
  transition: 0.2s ease;
}

.trend-item:hover .trend-bar {
  transform: translateY(-4px);
}

.role-bars {
  display: grid;
  gap: 18px;
  padding: 8px 0;
}

.role-bar__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #53647d;
}

.role-bar__label strong {
  color: #13243a;
}

@media (max-width: 1080px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
