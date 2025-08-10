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
        <div class="setting-list">
          <el-check-tag v-model:checked="selectHideServantMode">隐藏从者</el-check-tag>
          <el-popconfirm
            v-if="selectHideServantMode"
            confirm-button-text="确定"
            cancel-button-text="取消"
            title="确定要清除吗？"
            @confirm="handleClearHideServant"
          >
            <template #reference>
              <el-button class="short-btn" type="danger" 
                >清除隐藏从者</el-button
              >
            </template>
          </el-popconfirm>
        </div>
      </el-form-item>
    </el-form>
    <ServantSelector
      ref="servantSelector"
      :selected-classes="selectedClasses"
      :selected-stars="selectedStars"
      :selected-types="selectedTypes"
      :hide-servants="hideServants"
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

const selectedClasses = useLocalStorage<Set<string>>('selectedClasses', new Set());
const selectedTypes = useLocalStorage<Set<number>>('selectedTypes', new Set());
const selectedStars = useLocalStorage<Set<number>>('selectedStars', new Set());

const selectHideServantMode = ref(false);
const hideServants = useLocalStorage<Set<number>>('hideServants', new Set());

watch(selectHideServantMode, v => {
  const comp = servantSelector.value;
  if (!comp) return;
  if (v) {
    comp.startMultiSelect(hideServants.value);
  } else {
    comp.stopMultiSelect();
  }
});

const handleClearHideServant = () => {
  hideServants.value.clear();
  selectHideServantMode.value = false;
};

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

.short-btn {
  height: 28px;
  padding: 6px 14px;
}

.setting-list {
  display: flex;
  gap: 16px;
}
</style>
