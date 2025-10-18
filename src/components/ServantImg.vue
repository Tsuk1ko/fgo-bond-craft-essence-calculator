<template>
  <img class="servant-img" :src="src" :alt="name" />
</template>

<script setup lang="ts">
const { id, name } = defineProps<{
  id: number;
  name?: string;
}>();

const src = computed(() => `assets/servant/Servant${id.toString().padStart(3, '0')}.jpg`);
</script>

<style scoped lang="scss">
.servant-img {
  display: block;
  width: var(--servant-img-size, 64px);
  flex-grow: 0;
  flex-shrink: 0;
}
</style>
