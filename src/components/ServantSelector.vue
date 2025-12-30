<template>
  <div class="servant-selector" :class="{ 'multi-select-mode': multiSelectMode }">
    <el-scrollbar>
      <div v-for="[className, group] in groupedServants" :key="className" class="servant-group">
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
                @click="onServantClick(s.id)"
                @contextmenu.prevent="emit('itemContextmenu', $event, s.id)"
              />
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
import { groupBy, maxBy } from 'es-toolkit';
import { classSortIndex, servantList, typeList } from '@/utils/data';
import type { Servant } from '@/utils/data';
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
  minTypeNum = 1,
} = defineProps<{
  selectedClasses?: Set<string>;
  selectedTypes?: Set<number>;
  selectedStars?: Set<number>;
  disableFilter?: boolean;
  disableBadge?: boolean;
  disableTooltip?: boolean;
  disableHideServant?: boolean;
  hideServants?: Set<number>;
  minTypeNum?: number;
}>();

const emit = defineEmits<{
  (e: 'itemContextmenu', event: MouseEvent, id: number): void;
}>();

const filteredServantsWithoutTypes = computed(() =>
  servantList.filter(s => {
    if (disableFilter) return true;
    if (!disableHideServant && hideServants.has(s.id)) return false;
    if (selectedClasses.size && !selectedClasses.has(s.class)) return false;
    if (selectedStars.size && !selectedStars.has(s.star)) return false;
    return true;
  }),
);

const filteredServantsFull = computed(() =>
  filteredServantsWithoutTypes.value
    .filter(s => !selectedTypes.size || s.types.some(t => selectedTypes.has(t)))
    .map((s: Servant) => {
      const hasSelectedTypes = Boolean(selectedTypes.size);
      const selected = hasSelectedTypes ? s.types.filter(t => selectedTypes.has(t)) : s.types;
      const { firstTypeTooltip = [], secondTypeTooltip = [] } = groupBy(
        s.types.map(i => ({
          text: typeList[i],
          comment: s.typeComments?.[i],
          disabled: hasSelectedTypes ? !selectedTypes.has(i) : false,
        })),
        item => (item.disabled ? 'secondTypeTooltip' : 'firstTypeTooltip'),
      );
      return {
        ...s,
        selectedTypes: selected,
        hasTypeComment: s.typeComments && selected.some(i => i in s.typeComments!),
        typeTooltip: [...firstTypeTooltip, ...secondTypeTooltip],
      };
    }),
);

const maxTypeNum = computed(
  () => maxBy(filteredServantsFull.value, s => s.selectedTypes.length)?.selectedTypes.length ?? 0,
);

const filteredServants = computed(() => {
  const minVal = Math.min(minTypeNum, maxTypeNum.value);
  return filteredServantsFull.value.filter(s => s.selectedTypes.length >= minVal);
});

const groupedServants = computed(() => {
  const groups = Object.entries(groupBy(filteredServants.value, s => s.class));
  groups.sort(([a], [b]) => classSortIndex[a]! - classSortIndex[b]!);
  groups.forEach(([, servants]) => {
    servants.sort((a, b) =>
      a.selectedTypes.length === b.selectedTypes.length || disableFilter
        ? b.star - a.star
        : b.selectedTypes.length - a.selectedTypes.length,
    );
  });
  return groups;
});

const multiSelectMode = ref(false);
const selectedServants = ref<Set<number>>(new Set());

const startMultiSelect = (init: Set<number>) => {
  multiSelectMode.value = true;
  selectedServants.value = init;
};

const stopMultiSelect = () => {
  multiSelectMode.value = false;
  selectedServants.value = new Set();
};

const onServantClick = (id: number) => {
  if (!multiSelectMode.value) return;
  if (selectedServants.value.has(id)) selectedServants.value.delete(id);
  else selectedServants.value.add(id);
};

defineExpose({
  filteredServants,
  filteredServantsWithoutTypes,
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
