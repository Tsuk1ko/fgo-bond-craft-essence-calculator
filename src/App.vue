<template>
  <el-button class="github-btn" :icon="IconGithub" circle text @click="gotoGithub" />
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
            :filtered-servants="servantSelector?.filteredServants"
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
      <el-dropdown-item :icon="Compass" @click="handleGotoWiki">前往 WIKI</el-dropdown-item>
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
import { ArrowDown, ArrowUp, Compass, Hide, Setting } from '@element-plus/icons-vue';
import { useLocalStorage } from '@vueuse/core';
import { isNil } from 'es-toolkit';
import IconGithub from '@/assets/github.svg';
import { servantMap, typeList } from '@/utils/data';
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

const isOptionsFormCollapsed = useLocalStorage('isOptionsFormCollapsed', false);

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

const handleGotoWiki = () => {
  if (isNil(curContextMenuServantId)) return;
  window.open(`https://fgo.wiki/w/${servantMap[curContextMenuServantId]!.nameLink}`, '_blank');
};

const gotoGithub = () => {
  window.open('https://github.com/Tsuk1ko/fgo-bond-craft-essence-calculator', '_blank');
};
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  padding: var(--page-y-padding) 0;
  width: 100%;
  height: 100%;

  :deep(.el-form-item) {
    margin-bottom: 8px;
  }

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

  @media (max-width: 768px) {
    top: 0;
    right: 0;
    transform-origin: top right;
    transform: scale(0.9);
  }
}

.options-form {
  margin-bottom: 8px;
  padding: 0 var(--page-x-padding);
  overflow: hidden;
  transition: all 0.2s;
  interpolate-size: allow-keywords;

  &.collapsed {
    height: 0;
  }
}

.options-form-wrapper {
  position: relative;

  .collapse-btn {
    position: absolute;
    bottom: -12px;
    right: var(--page-y-padding);
    transform: translateY(50%);
    z-index: 10;
  }
}

.servant-selector {
  :deep(.el-scrollbar__view) {
    padding: 0 var(--page-x-padding);
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

<style lang="scss">
:root {
  --page-x-padding: 64px;
  --page-y-padding: 32px;
}

.el-form {
  --el-form-label-font-size: 18px;

  &-item__label {
    padding-right: 24px;
  }
}

.el-input {
  --el-input-height: 28px;
}

.el-badge__content {
  line-height: 1;
}

@media (max-width: 992px) {
  :root {
    --page-x-padding: 32px;
    --page-y-padding: 24px;
  }
}

@media (max-width: 768px) {
  :root {
    --page-x-padding: 24px;
    --page-y-padding: 16px;
    --el-font-size-base: 12px;
  }

  .el-form {
    --el-form-label-font-size: 14px;

    &-item__label {
      height: auto;
      line-height: 24px;
      padding-right: 16px;
    }
  }

  .el-check-tag {
    padding: 6px 9px;
  }

  .el-input {
    --el-input-height: 24px;

    &-number {
      width: 120px;
    }
  }
}

.el-check-tag,
.no-wrap {
  text-wrap: nowrap;
}

.font-size-base {
  font-size: var(--el-font-size-base);
}
</style>
