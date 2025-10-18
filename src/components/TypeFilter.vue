<template>
  <div class="type-filter">
    <el-check-tag
      v-for="(name, i) in typeList"
      :key="name"
      :checked="selected.has(i)"
      @change="onChange(i)"
      >{{ name }}</el-check-tag
    >
    <ClearBtn @click="selected.clear()" />
  </div>
</template>

<script setup lang="ts">
import { typeList } from '@/utils/data';
import ClearBtn from './ClearBtn.vue';

const { selected } = defineProps<{
  selected: Set<number>;
}>();

const onChange = (value: number) => {
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
};
</script>

<style lang="scss" scoped>
.type-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
