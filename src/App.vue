<template>
  <el-button
    class="github-btn"
    :class="{ hidden: isOptionsFormCollapsed }"
    :icon="IconGithub"
    circle
    text
    @click="gotoGithub"
  />
  <div class="container">
    <div class="options-form-wrapper">
      <el-form
        class="options-form"
        :class="{ collapsed: isOptionsFormCollapsed }"
        label-width="auto"
      >
        <el-form-item class="options-label" label="职阶">
          <ClassFilter :selected="selectedClasses" />
        </el-form-item>
        <el-form-item class="options-label" label="星级">
          <StarFilter :selected="selectedStars" />
        </el-form-item>
        <el-form-item class="options-label" label="属性">
          <TypeFilter
            :selected="selectedTypes"
            :filtered-servants="servantStore.filteredServantsForDisplayWithMinTypeNum"
          />
        </el-form-item>
        <el-form-item class="options-label" label="组合">
          <TypeCombination
            :servants="servantStore.filteredServantsWithoutTypes"
            @apply-type-filter="handleApplyTypeFilter"
          />
        </el-form-item>
        <el-form-item class="options-label" label="设置">
          <div class="setting-list">
            <div class="check-tag-group">
              <el-check-tag v-model:checked="hideServantMode">隐藏从者</el-check-tag>
              <el-check-tag v-model:checked="selectHideServantMode" class="setting-check-tag">
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
              <span class="font-size-base no-wrap">只看≥</span>
              <el-input-number v-model="minTypeNum" :min="1" :max="typeList.length" />
            </div>
          </div>
        </el-form-item>
      </el-form>
      <el-button
        class="collapse-btn"
        link
        type="primary"
        @click="isOptionsFormCollapsed = !isOptionsFormCollapsed"
      >
        {{ isOptionsFormCollapsed ? '展开' : '收起' }}&nbsp;
        <el-icon>
          <ArrowDown v-if="isOptionsFormCollapsed" />
          <ArrowUp v-else />
        </el-icon>
      </el-button>
    </div>
    <ServantSelector
      :data="servantStore.servantGroupsForDisplay"
      :disable-badge="selectHideServantMode"
      :multi-select-mode="selectHideServantMode"
      :selected="hideServants"
      @item-contextmenu="contextMenuRef?.open"
    />
    <ServantContextMenu ref="contextMenuRef" />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp, Setting } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';
import IconGithub from '@/assets/github.svg';
import { typeList } from '@/utils/data';
import ClassFilter from './components/ClassFilter.vue';
import ServantContextMenu from './components/ServantContextMenu.vue';
import ServantSelector from './components/ServantSelector.vue';
import StarFilter from './components/StarFilter.vue';
import TypeCombination from './components/TypeCombination.vue';
import TypeFilter from './components/TypeFilter.vue';
import { useServantStore } from './stores/servant';
import { useSettingsStore } from './stores/settings';

const contextMenuRef = useTemplateRef('contextMenuRef');

const {
  selectedClasses,
  selectedTypes,
  selectedStars,
  hideServantMode,
  hideServants,
  minTypeNum,
  isOptionsFormCollapsed,
  selectHideServantMode,
} = storeToRefs(useSettingsStore());

const servantStore = useServantStore();

const handleClearHideServant = () => {
  hideServants.value.clear();
  selectHideServantMode.value = false;
};

const gotoGithub = () => {
  window.open('https://github.com/Tsuk1ko/fgo-bond-craft-essence-calculator', '_blank');
};

const handleApplyTypeFilter = (comb: number[]) => {
  selectedTypes.value = new Set(comb);
};
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  padding-top: var(--page-y-padding);
  width: 100%;
  height: 100%;

  :deep(.el-form-item__label-wrap) {
    align-items: center;
    font-weight: bold;
  }

  :deep(.el-form-item__content) {
    line-height: unset;
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
  transition: all 0.2s;

  &.hidden {
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    top: 0;
    right: 0;
    transform-origin: top right;
    transform: scale(0.9);
  }
}

.options-form {
  padding: 0 var(--page-x-padding);
  overflow: hidden;
  transition: all 0.2s;
  interpolate-size: allow-keywords;

  &.collapsed {
    height: 0;
  }

  :deep(.el-form-item) {
    margin-bottom: 8px;
  }
}

.options-form-wrapper {
  position: relative;
  @media (max-width: 768px) {
    padding-bottom: 20px;
  }
}

.collapse-btn {
  position: absolute;
  bottom: 0;
  right: var(--page-x-padding);
  z-index: 10;

  &-placeholder {
    width: 52px;
    height: 20px;
  }
}

.servant-selector {
  --servant-selector-bottom-padding: calc(var(--page-y-padding) + 16px);

  :deep(.el-scrollbar__view) {
    display: flow-root;
    margin: 0 var(--page-x-padding);
  }
}

.short-btn {
  height: 28px;
  padding: 6px 14px;

  @media (max-width: 768px) {
    height: 24px;
    padding: 5px 11px;
  }
}

.setting-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.min-type-num {
  display: flex;
  align-items: center;
  gap: 4px;
}

.check-tag-group {
  display: flex;
  align-items: center;

  .el-check-tag:first-of-type {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 1px solid var(--el-border-color);
  }
  .el-check-tag:last-of-type {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
}

.setting-check-tag {
  line-height: 0;
  padding-left: 11px;
  padding-right: 11px;

  @media (max-width: 768px) {
    padding-left: 9px;
    padding-right: 9px;
  }
}
</style>
