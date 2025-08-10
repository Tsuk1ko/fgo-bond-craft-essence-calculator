<template>
  <div class="star-filter">
    <el-check-tag
      v-for="i in 6"
      :key="i"
      :checked="selected.has(i - 1)"
      @change="onChange(i - 1)"
      >{{ i - 1 }}</el-check-tag
    >
    <ClearBtn @click="selected.clear()" />
  </div>
</template>

<script setup lang="ts">
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
.star-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
</style>
