<template>
  <div class="class-filter">
    <ClassIcon
      v-for="name in classList"
      :key="name"
      :title="name"
      :name
      :class="{ selected: selected.has(name) }"
      @click="toggleClass(name)"
    />
    <ClearBtn @click="selected.clear()" />
  </div>
</template>

<script setup lang="ts">
import { classList } from '@/utils/data';
import ClassIcon from './ClassIcon.vue';
import ClearBtn from './ClearBtn.vue';

const { selected } = defineProps<{
  selected: Set<string>;
}>();

const toggleClass = (name: string) => {
  if (selected.has(name)) selected.delete(name);
  else selected.add(name);
};
</script>

<style lang="scss" scoped>
.class-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.class-icon {
  --class-icon-size: 32px;
  cursor: pointer;
  transition: filter 0.2s;

  &:not(.selected) {
    filter: brightness(0.65);
  }

  @media (max-width: 768px) {
    --class-icon-size: 28px;
  }
}
</style>
