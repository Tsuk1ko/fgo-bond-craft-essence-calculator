<template>
  <div class="servant-img">
    <img class="servant-img__img" :src="src" :alt="name" />
    <ClassIcon
      v-if="isVirtual && className"
      class="servant-img__class-icon"
      :name="className"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { getTypeName, isVirtualServantId } from '@/utils/data';
import ClassIcon from './ClassIcon.vue';

const { id, name, virtualClass } = defineProps<{
  id: number;
  name?: string;
  virtualClass?: string | null;
}>();

const isVirtual = computed(() => isVirtualServantId(id));

const className = computed(() =>
  virtualClass !== undefined ? virtualClass : isVirtual.value ? getTypeName(id) : '',
);

const src = computed(() =>
  isVirtual.value
    ? 'assets/other/unknown-servant.webp'
    : `assets/servant/Servant${id.toString().padStart(3, '0')}.jpg`,
);
</script>

<style scoped lang="scss">
.servant-img {
  position: relative;
  width: var(--servant-img-size, 64px);
  flex-grow: 0;
  flex-shrink: 0;
}

.servant-img__img {
  display: block;
  width: 100%;
}

.servant-img__class-icon {
  position: absolute;
  top: 1px;
  left: 1px;
  --class-icon-size: calc(var(--servant-img-size, 64px) * 0.28125);
}
</style>
