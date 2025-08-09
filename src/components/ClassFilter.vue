<template>
  <div class="class-filter">
    <ClassIcon
      v-for="name in classList"
      :key="name"
      :name
      :class="{ selected: selected.has(name) }"
      @click="toggleClass(name)"
    />
  </div>
</template>

<script setup lang="ts">
import { classList } from '@/utils/data';
import ClassIcon from './ClassIcon.vue';

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
  cursor: pointer;

  &:not(.selected) {
    filter: brightness(0.6);
  }
}
</style>
