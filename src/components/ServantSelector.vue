<template>
  <div class="servant-selector" :class="{ 'multi-select-mode': multiSelectMode }">
    <el-scrollbar>
      <div v-for="[className, group] in data" :key="className" class="servant-group">
        <div class="servant-group-title">
          <ClassIcon :name="className" />
          {{ className }}
        </div>
        <div class="servant-group-content">
          <el-badge
            v-for="s in group"
            :key="s.id"
            :value="s.selectedTypes.length"
            :type="s.hasTypeComment ? 'warning' : undefined"
            :hidden="disableBadge || (!s.hasTypeComment && s.selectedTypes.length <= 1)"
          >
            <el-tooltip
              popper-class="servant-type-tooltip"
              placement="top"
              :disabled="disableTooltip"
              :enterable="false"
              :hide-after="0"
            >
              <template #content>
                <div class="type-title">{{ s.name }}</div>
                <div
                  v-for="{ text, comment, disabled } in s.typeTooltip"
                  :key="text"
                  :class="{ 'type-disabled': disabled }"
                >
                  {{ text }}<span v-if="comment" class="type-comment">{{ comment }}</span>
                </div>
              </template>
              <ServantImg
                :id="s.id"
                :name="s.name"
                @click="handleClickServant(s.id)"
                @contextmenu.prevent="emit('itemContextmenu', $event, s.id)"
              />
            </el-tooltip>
            <el-checkbox
              v-if="multiSelectMode"
              class="servant-checkbox"
              :model-value="selected.has(s.id)"
              size="large"
            />
          </el-badge>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import type { ServantGroupForDisplay } from '@/types';
import { toggleSet } from '@/utils/common';
import ClassIcon from './ClassIcon.vue';
import ServantImg from './ServantImg.vue';

const {
  data,
  disableBadge = false,
  disableTooltip = false,
  multiSelectMode = false,
  selected = new Set(),
} = defineProps<{
  data: ServantGroupForDisplay[];
  disableBadge?: boolean;
  disableTooltip?: boolean;
  multiSelectMode?: boolean;
  selected?: Set<number>;
}>();

const emit = defineEmits<{
  (e: 'itemContextmenu', event: MouseEvent, id: number): void;
}>();

const handleClickServant = (id: number) => {
  if (!multiSelectMode) return;
  toggleSet(selected, id);
};
</script>

<style lang="scss" scoped>
.servant-selector {
  flex: 1;
  min-height: 0;
}

.servant-group {
  display: flex;
  flex-direction: column;
  gap: 16px;

  & + & {
    margin-top: 16px;
  }

  &-title {
    --class-icon-size: 24px;
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: bold;
    font-size: 18px;
    line-height: 24px;
  }

  &-content {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  &-checkbox {
    position: absolute;
    top: 0;
    left: 0;
  }
}

.servant-checkbox {
  position: absolute;
  top: 0;
  left: 0;
  height: auto;
  pointer-events: none;
  :deep(.el-checkbox__inner) {
    border-color: var(--el-checkbox-input-border-color-hover);
  }
}

.type-title {
  color: var(--el-color-primary);
  filter: brightness(1.3);
  font-weight: bold;
}

.type-disabled {
  opacity: 0.4;
}

.type-comment {
  margin-left: 8px;
  color: var(--el-color-warning);
  filter: brightness(1.2);
}

.multi-select-mode {
  .servant-img {
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
}

@media (max-width: 768px) {
  .servant-selector {
    --servant-img-size: 48px;
  }

  .servant-group,
  .servant-group-content {
    gap: 12px;
  }
}
</style>
