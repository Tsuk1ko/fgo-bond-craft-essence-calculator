<template>
  <el-button class="github-btn" :icon="IconGithub" circle text @click="gotoGithub" />
  <div class="container">
    <el-form class="options-form" label-width="auto">
      <el-form-item class="options-label" label="职阶">
        <ClassFilter :selected="selectedClasses" />
      </el-form-item>
      <el-form-item class="options-label" label="星级">
        <StarFilter :selected="selectedStars" />
      </el-form-item>
      <el-form-item class="options-label" label="属性">
        <TypeFilter :selected="selectedTypes" />
      </el-form-item>
      <el-form-item class="options-label" label="设置">
        <el-check-tag v-model:checked="selectHideServantMode">隐藏从者</el-check-tag>
      </el-form-item>
    </el-form>
    <ServantSelector
      ref="servantSelector"
      :selected-classes="selectedClasses"
      :selected-stars="selectedStars"
      :selected-types="selectedTypes"
      :hide-servants="hideServantsSet"
      :disable-hide-servant="selectHideServantMode"
      :disable-badge="selectHideServantMode"
      :disable-tooltip="selectHideServantMode"
    />
  </div>
</template>

<script setup lang="ts">
import IconGithub from '@/assets/github.svg';
import ClassFilter from './components/ClassFilter.vue';
import StarFilter from './components/StarFilter.vue';
import TypeFilter from './components/TypeFilter.vue';
import ServantSelector from './components/ServantSelector.vue';
import { useLocalStorage } from '@vueuse/core';

const servantSelector = useTemplateRef('servantSelector');

const selectedClasses = ref(new Set<string>());
const selectedTypes = ref(new Set<number>());
const selectedStars = ref(new Set<number>());

const selectHideServantMode = ref(false);
const hideServants = useLocalStorage<number[]>('hideServants', []);
const hideServantsSet = computed({
  get: () => new Set(hideServants.value),
  set: v => {
    hideServants.value = Array.from(v);
  },
});

watch(selectHideServantMode, v => {
  const comp = servantSelector.value;
  if (!comp) return;
  if (v) {
    comp.startMultiSelect(hideServantsSet.value);
  } else {
    hideServantsSet.value = comp.stopMultiSelect();
  }
});

const gotoGithub = () => {
  window.open('https://github.com/Tsuk1ko/fgo-bond-craft-essence-calculator', '_blank');
};
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 32px 0;
  width: 100%;
  height: 100%;

  :deep(.el-form-item) {
    margin-bottom: 8px;
  }

  :deep(.el-form-item__label-wrap) {
    --el-form-label-font-size: 18px;
    align-items: center;
    font-weight: bold;
  }

  :deep(.el-form-item__label) {
    padding-right: 24px;
  }
}

.github-btn {
  --el-fill-color-light: rgba(0, 0, 0, 0.1);
  --el-fill-color: rgba(0, 0, 0, 0.15);
  padding: 4px;
  font-size: 18px;
  position: absolute;
  top: 8px;
  right: 8px;
}

.options-form {
  padding: 0 64px;
}

.servant-selector {
  :deep(.el-scrollbar__view) {
    padding: 0 64px;
  }
}
</style>
