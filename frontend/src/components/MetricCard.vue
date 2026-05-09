<template>
  <div class="metric-card">
    <div class="metric-card__label">{{ label }}</div>
    <div class="metric-card__value">{{ value }}</div>
    <div class="metric-card__hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string }>();
</script>
