<template>
  <div class="servant-img">
    <img width="100%" height="100%" :src="src" :alt="name" @load="loading = false" />
    <el-skeleton
      v-if="loading"
      class="servant-img-skeleton"
      :loading="true"
      :throttle="500"
      animated
    >
      <template #template>
        <el-skeleton-item class="servant-img-skeleton-item" variant="image" />
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
const { id, name } = defineProps<{
  id: number;
  name?: string;
}>();

const loading = ref(true);

const src = computed(() => `assets/servant/Servant${id.toString().padStart(3, '0')}.jpg`);
</script>

<style scoped lang="scss">
.servant-img {
  width: 64px;
  height: 70px;
  flex-grow: 0;
  flex-shrink: 0;
}

.servant-img-skeleton {
  position: absolute;
  top: 0;
  left: 0;

  &,
  &-item {
    width: 100%;
    height: 100%;
  }
}
</style>
