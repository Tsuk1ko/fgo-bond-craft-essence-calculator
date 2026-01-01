<template>
  <div class="star-filter">
    <el-check-tag
      v-for="i in 6"
      :key="i"
      class="star-filter-check-tag"
      :checked="selected.has(i - 1)"
      @change="toggleSet(selected, i - 1)"
      >{{ i - 1 }}</el-check-tag
    >
    <ClearBtn @click="selected.clear()" />
  </div>
</template>

<script setup lang="ts">
import { toggleSet } from '@/utils/common';
import ClearBtn from './ClearBtn.vue';

const { selected } = defineProps<{
  selected: Set<number>;
}>();
</script>

<style lang="scss" scoped>
.star-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.star-filter-check-tag {
  min-width: 32px;
  text-align: center;
}
</style>
