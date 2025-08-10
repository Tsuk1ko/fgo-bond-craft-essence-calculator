<template>
  <img class="class-icon" :src="src" :alt="name" />
</template>

<script setup lang="ts">
const { name } = defineProps<{
  name: string;
}>();

const src = computed(() => `assets/class/${name}.png`);
</script>

<style scoped lang="scss">
.class-icon {
  display: block;
  width: var(--class-icon-size, 45px);
  height: var(--class-icon-size, 45px);
  flex-grow: 0;
  flex-shrink: 0;
}
</style>
