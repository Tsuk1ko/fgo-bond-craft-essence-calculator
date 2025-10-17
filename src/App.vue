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
          <div class="check-tag-group">
            <el-check-tag v-model:checked="hideServantMode">隐藏从者</el-check-tag>
            <el-check-tag
              v-model:checked="selectHideServantMode"
              type="warning"
              style="line-height: 0; padding: 7px 11px"
            >
              <el-icon><Setting /></el-icon>
            </el-check-tag>
          </div>
          <el-popconfirm
            v-if="selectHideServantMode"
            confirm-button-text="确定"
            cancel-button-text="取消"
            title="确定要清除吗？"
            @confirm="handleClearHideServant"
          >
            <template #reference>
              <el-button class="short-btn" type="danger">清除隐藏从者</el-button>
            </template>
          </el-popconfirm>
          <div class="min-type-num">
            只看≥
            <el-input-number v-model="minTypeNum" :min="1" :max="typeList.length" />
          </div>
        </div>
      </el-form-item>
    </el-form>
    <ServantSelector
      ref="servantSelector"
      :selected-classes="selectedClasses"
      :selected-stars="selectedStars"
      :selected-types="selectedTypes"
      :hide-servants="hideServantMode ? hideServants : undefined"
      :disable-hide-servant="selectHideServantMode"
      :disable-badge="selectHideServantMode"
      :disable-tooltip="selectHideServantMode"
      :min-type-num="minTypeNum"
      @item-contextmenu="handleItemContextmenu"
    />
    <ContextMenu ref="contextMenuRef">
      <el-dropdown-item :icon="Compass" @click="handleMenuClickHideServant"
        >前往 WIKI</el-dropdown-item
      >
      <el-dropdown-item
        v-if="hideServantMode && !selectHideServantMode"
        :icon="Hide"
        @click="handleMenuClickHideServant"
        >隐藏该从者</el-dropdown-item
      >
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import { Compass, Hide, Setting } from '@element-plus/icons-vue';
import { useLocalStorage } from '@vueuse/core';
import { isNil } from 'es-toolkit';
import IconGithub from '@/assets/github.svg';
import { typeList } from '@/utils/data';
import ClassFilter from './components/ClassFilter.vue';
import ContextMenu from './components/ContextMenu.vue';
import ServantSelector from './components/ServantSelector.vue';
import StarFilter from './components/StarFilter.vue';
import TypeFilter from './components/TypeFilter.vue';

const servantSelector = useTemplateRef('servantSelector');
const contextMenuRef = useTemplateRef('contextMenuRef');

const selectedClasses = useLocalStorage<Set<string>>('selectedClasses', new Set());
const selectedTypes = useLocalStorage<Set<number>>('selectedTypes', new Set());
const selectedStars = useLocalStorage<Set<number>>('selectedStars', new Set());

const hideServantMode = useLocalStorage('hideServantMode', true);
const selectHideServantMode = ref(false);
const hideServants = useLocalStorage<Set<number>>('hideServants', new Set());
const minTypeNum = useLocalStorage<number>('minTypeNum', 1);

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

let curContextMenuServantId: number | undefined;

const handleItemContextmenu = (event: MouseEvent, id: number) => {
  curContextMenuServantId = id;
  contextMenuRef.value?.open(event);
};

const handleMenuClickHideServant = () => {
  if (isNil(curContextMenuServantId)) return;
  hideServants.value.add(curContextMenuServantId);
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

  :deep(.el-form-item__content) {
    line-height: unset;
  }

  :deep(.el-input) {
    --el-input-height: 28px;
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

.min-type-num {
  display: flex;
  align-items: center;
  gap: 4px;
}

.check-tag-group {
  display: flex;
  .el-check-tag:first-of-type {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .el-check-tag:last-of-type {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
}
</style>
