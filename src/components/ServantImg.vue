<template>
  <img class="servant-img" :src="src" :alt="name" />
</template>
  
<script setup lang='ts'>
const { name } = defineProps<{
  name: string;
}>();

const src = computed(() => `assets/servant/${name}`);
</script>
  
<style scoped lang="scss">
.servant-img {
  width: 64px;
  height: 70px;
  flex-grow: 0;
  flex-shrink: 0;
}
</style>
