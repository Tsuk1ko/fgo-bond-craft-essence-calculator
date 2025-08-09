<template>
  <div class="type-filter">
    <el-check-tag
      v-for="(name, i) in typeList"
      :key="name"
      :checked="selected.has(i)"
      @change="onChange(i)"
      >{{ name }}</el-check-tag
    >
  </div>
</template>

<script setup lang="ts">
import { typeList } from '@/utils/data';

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
  --el-font-size-base: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
</style>
