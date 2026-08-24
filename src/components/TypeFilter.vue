<template>
  <div class="type-filter">
    <el-badge
      v-for="({ id, name }, i) in items"
      :key="id"
      :value="numbers[i] ?? 0"
      :show-zero="false"
      :max="Infinity"
      type="primary"
      badge-class="type-filter-badge"
    >
      <el-check-tag :checked="selected.has(id)" @change="toggleSet(selected, id)">{{
        name
      }}</el-check-tag>
    </el-badge>
    <ClearBtn @click="selected.clear()" />
  </div>
</template>

<script setup lang="ts">
import { toggleSet } from '@/utils/common';
import type { Servant, TypeItem } from '@/utils/data';
import ClearBtn from './ClearBtn.vue';

const {
  selected,
  items,
  filteredServants = [],
} = defineProps<{
  selected: Set<number>;
  items: TypeItem[];
  filteredServants?: Servant[];
}>();

const numbers = computed(() => {
  const counts = new Map(items.map(({ id }) => [id, 0]));
  filteredServants.forEach(s => {
    s.types.forEach(t => {
      if (counts.has(t)) counts.set(t, counts.get(t)! + 1);
    });
  });
  return items.map(({ id }) => counts.get(id) ?? 0);
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
