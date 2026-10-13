<template>
  <div class="class-filter">
    <button
      v-for="name in classList"
      :key="name"
      type="button"
      class="class-button"
      :title="name"
      :aria-label="name"
      :aria-pressed="selected.has(name)"
      :class="{ selected: selected.has(name) }"
      @click="toggleSet(selected, name)"
    >
      <ClassIcon :name aria-hidden="true" />
    </button>
    <ClearBtn @click="selected.clear()" />
  </div>
</template>

<script setup lang="ts">
import { toggleSet } from '@/utils/common';
import { classList } from '@/utils/data';
import ClassIcon from './ClassIcon.vue';
import ClearBtn from './ClearBtn.vue';

const { selected } = defineProps<{
  selected: Set<string>;
}>();
</script>

<style lang="scss" scoped>
.class-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.class-button {
  border: 0;
  background: transparent;
  padding: 0;
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
