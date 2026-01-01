<template>
  <div class="type-filter">
    <el-badge
      v-for="(name, i) in typeList"
      :key="name"
      :value="numbers[i] ?? 0"
      :show-zero="false"
      :max="Infinity"
      type="primary"
      badge-class="type-filter-badge"
    >
      <el-check-tag :checked="selected.has(i)" @change="toggleSet(selected, i)">{{
        name
      }}</el-check-tag>
    </el-badge>
    <ClearBtn @click="selected.clear()" />
  </div>
</template>

<script setup lang="ts">
import { toggleSet } from '@/utils/common';
import { servantMap, typeList } from '@/utils/data';
import type { Servant } from '@/utils/data';
import ClearBtn from './ClearBtn.vue';

const { selected, filteredServants = [] } = defineProps<{
  selected: Set<number>;
  filteredServants?: Servant[];
}>();

const numbers = computed(() => {
  const data = Array.from({ length: typeList.length }, () => 0);
  filteredServants.forEach(({ id }) => {
    servantMap[id]!.types.forEach(t => {
      data[t]!++;
    });
  });
  return data;
});
</script>

<style lang="scss" scoped>
.type-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

<style>
.type-filter-badge {
  right: calc(-1 * var(--el-badge-size) / 2 + 4px) !important;
  transform: translateY(-50%) !important;
}
</style>
