<template>
  <section class="page-block">
    <div class="page-block__head" v-if="title || extra">
      <div>
        <h3 v-if="title">{{ title }}</h3>
        <p v-if="desc">{{ desc }}</p>
      </div>
      <div class="page-block__extra">
        <slot name="extra" />
      </div>
    </div>
    <div class="page-block__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title?: string; desc?: string; extra?: boolean }>();
</script>
