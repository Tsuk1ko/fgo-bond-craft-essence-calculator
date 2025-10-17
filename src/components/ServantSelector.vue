<template>
  <div class="servant-selector" :class="{ 'multi-select-mode': multiSelectMode }">
    <el-scrollbar>
      <div class="servant-group" v-for="[className, group] in groupedServants" :key="className">
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
                <div v-for="{ text, comment } in s.typeTooltip" :key="text">
                  {{ text }}<span class="type-comment" v-if="comment">{{ comment }}</span>
                </div>
              </template>
              <ServantImg :id="s.id" :name="s.name" @click="onServantClick(s.id)" />
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
import { classSortIndex, servantList, typeList, type Servant } from '@/utils/data';
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

const filteredServants0 = computed(() =>
  servantList
    .filter(s => {
      if (disableFilter) return true;
      if (!disableHideServant && hideServants.has(s.id)) return false;
      if (selectedClasses.size && !selectedClasses.has(s.class)) return false;
      if (selectedStars.size && !selectedStars.has(s.star)) return false;
      if (selectedTypes.size && !s.types.some(t => selectedTypes.has(t))) return false;
      return true;
    })
    .map((s: Servant) => {
      const selected = selectedTypes.size ? s.types.filter(t => selectedTypes.has(t)) : s.types;
      return {
        ...s,
        selectedTypes: selected,
        hasTypeComment: s.typeComments && selected.some(i => i in s.typeComments!),
        typeTooltip: selected.map(i => {
          const text = typeList[i];
          const comment = s.typeComments?.[i];
          return { text, comment };
        }),
      };
    }),
);

const maxTypeNum = computed(
  () => maxBy(filteredServants0.value, s => s.selectedTypes.length)?.selectedTypes.length ?? 0,
);

const filteredServants = computed(() => {
  const minVal = Math.min(minTypeNum, maxTypeNum.value);
  return filteredServants0.value.filter(s => s.selectedTypes.length >= minVal);
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

.type-num {
  line-height: 1;
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
</style>
