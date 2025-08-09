<template>
  <div class="servant-selector" :class="{ 'multi-select-mode': multiSelectMode }">
    <el-scrollbar>
      <div class="servant-group" v-for="(group, className) in groupedServants" :key="className">
        <div class="servant-group-title">
          <ClassIcon :name="className" />
          {{ className }}
        </div>
        <div class="servant-group-content">
          <el-badge
            v-for="s in group"
            class="type-num"
            :key="s.name"
            :value="s.selectedTypes.length"
            :hidden="disableBadge || s.selectedTypes.length <= 1"
          >
            <el-tooltip
              popper-class="servant-type-tooltip"
              placement="top"
              :disabled="disableTooltip"
              :enterable="false"
              :hide-after="0"
              :content="getTypeTooltip(s.selectedTypes)"
            >
              <ServantImg :name="s.name" @click="onServantClick(s.id)" />
            </el-tooltip>
            <el-checkbox
              v-if="multiSelectMode"
              class="servant-checkbox"
              :model-value="selectedServants.has(s.id)"
              size="large"
            />
          </el-badge>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { groupBy } from 'es-toolkit';
import { servantList, typeList } from '@/utils/data';
import ClassIcon from './ClassIcon.vue';
import ServantImg from './ServantImg.vue';

const {
  selectedClasses = new Set(),
  selectedTypes = new Set(),
  selectedStars = new Set(),
  disableFilter = false,
  disableBadge = false,
  disableTooltip = false,
  disableHideServant = false,
  hideServants = new Set(),
} = defineProps<{
  selectedClasses?: Set<string>;
  selectedTypes?: Set<number>;
  selectedStars?: Set<number>;
  disableFilter?: boolean;
  disableBadge?: boolean;
  disableTooltip?: boolean;
  disableHideServant?: boolean;
  hideServants?: Set<number>;
}>();

const filteredServants = computed(() =>
  servantList
    .filter(s => {
      if (disableFilter) return true;
      if (!disableHideServant && hideServants.has(s.id)) return false;
      if (selectedClasses.size && !selectedClasses.has(s.class)) return false;
      if (selectedStars.size && !selectedStars.has(s.star)) return false;
      if (selectedTypes.size && !s.types.some(t => selectedTypes.has(t))) return false;
      return true;
    })
    .map(s => ({
      ...s,
      selectedTypes: selectedTypes.size ? s.types.filter(t => selectedTypes.has(t)) : s.types,
    }))
    .sort((a, b) =>
      a.selectedTypes.length === b.selectedTypes.length || disableFilter
        ? b.star - a.star
        : b.selectedTypes.length - a.selectedTypes.length,
    ),
);

const getTypeTooltip = (types: number[]): string => types.map(t => typeList[t]).join('\n');

const groupedServants = computed(() => groupBy(filteredServants.value, s => s.class));

const multiSelectMode = ref(false);
const selectedServants = ref<Set<number>>(new Set());

const startMultiSelect = (init: Set<number>) => {
  multiSelectMode.value = true;
  selectedServants.value = init;
};

const stopMultiSelect = () => {
  multiSelectMode.value = false;
  const result = selectedServants.value;
  selectedServants.value = new Set();
  return result as Set<number>;
};

const onServantClick = (id: number) => {
  if (!multiSelectMode.value) return;
  if (selectedServants.value.has(id)) selectedServants.value.delete(id);
  else selectedServants.value.add(id);
};

defineExpose({
  startMultiSelect,
  stopMultiSelect,
});
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
    --class-icon-size: 32px;
    display: flex;
    gap: 16px;
    align-items: center;
    font-weight: bold;
    font-size: 20px;
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

.type-num {
  line-height: 1;
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
</style>

<style lang="scss">
.servant-type-tooltip {
  white-space: pre-wrap;
}
</style>
