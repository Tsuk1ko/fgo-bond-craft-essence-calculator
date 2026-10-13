<template>
  <el-dialog
    v-model="visible"
    :title="`选择第 ${index + 1} 格从者`"
    class="servant-picker-dialog"
    width="min(1100px, 90vw)"
    top="7vh"
    :close-on-click-modal="true"
    destroy-on-close
    @opened="focusFilters"
    @closed="emit('closed')"
  >
    <el-form ref="filterForm" class="picker-filters" label-width="auto" @submit.prevent>
      <el-form-item label="职阶"><ClassFilter :selected="classes" /></el-form-item>
      <el-form-item label="星级"><StarFilter :selected="stars" /></el-form-item>
      <el-form-item label="特性"
        ><TypeFilter :items="typeItems" :selected="types" :filtered-servants="filtered"
      /></el-form-item>
      <el-form-item label="组合"
        ><TypeCombination :servants="withoutTypes" @apply-type-filter="types = new Set($event)"
      /></el-form-item>
    </el-form>
    <p class="picker-hint">此处筛选仅用于查找；锁定从者不受从者池筛选与隐藏名单限制。</p>
    <ServantSelector v-if="filtered.length" :data="groups" single-select-mode @select="choose" />
    <p v-else class="picker-empty" role="status">没有符合条件的从者，请调整筛选。</p>
    <template #footer><el-button @click="clear">清除锁定</el-button></template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import type { PlannerInput } from '@/lib/auto-team';
import { lockServant } from '@/lib/auto-team/form';
import type { ServantForDisplay, ServantGroupForDisplay } from '@/types';
import { classList, getTypeName, servantList, typeItems } from '@/utils/data';
import ClassFilter from '../ClassFilter.vue';
import ServantSelector from '../ServantSelector.vue';
import StarFilter from '../StarFilter.vue';
import TypeCombination from '../TypeCombination.vue';
import TypeFilter from '../TypeFilter.vue';

const { input, index } = defineProps<{ input: PlannerInput; index: number }>();
const emit = defineEmits<{ closed: [] }>();
const visible = ref(true);
const filterForm = useTemplateRef('filterForm');
const focusFilters = () => filterForm.value?.$el.querySelector('button')?.focus();
const classes = ref(new Set<string>());
const stars = ref(new Set<number>());
const types = ref(new Set<number>());
const withoutTypes = computed(() =>
  servantList.filter(
    s =>
      s.id > 0 &&
      (!classes.value.size || classes.value.has(s.class)) &&
      (!stars.value.size || stars.value.has(s.star)),
  ),
);
const filtered = computed(() =>
  withoutTypes.value.filter(s => !types.value.size || s.types.some(t => types.value.has(t))),
);
const groups = computed<ServantGroupForDisplay[]>(() =>
  classList.flatMap(name => {
    const servants: ServantForDisplay[] = filtered.value
      .filter(s => s.class === name)
      .map(s => {
        const selectedTypes = types.value.size ? s.types.filter(t => types.value.has(t)) : s.types;
        return {
          ...s,
          selectedTypes,
          hasTypeComment: selectedTypes.some(t => Boolean(s.typeComments?.[t])),
          typeTooltip: s.types
            .map(t => ({
              text: getTypeName(t),
              comment: s.typeComments?.[t],
              disabled: Boolean(types.value.size) && !types.value.has(t),
            }))
            .sort((a, b) => Number(a.disabled) - Number(b.disabled)),
        };
      });
    servants.sort((a, b) => b.selectedTypes.length - a.selectedTypes.length || b.star - a.star);
    return servants.length ? [[name, servants] as ServantGroupForDisplay] : [];
  }),
);
const choose = (id: number) => {
  const conflict = lockServant(input, index, id);
  if (conflict !== undefined) {
    ElMessage.warning(`该从者已锁定在第 ${conflict + 1} 格`);
    return;
  }
  visible.value = false;
};
const clear = () => {
  lockServant(input, index, undefined);
  visible.value = false;
};
onDeactivated(() => {
  visible.value = false;
});
</script>

<style lang="scss">
.servant-picker-dialog {
  height: 84dvh;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  .el-dialog__body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .picker-filters {
    max-height: 42%;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 5px;
  }
  .el-form-item {
    margin-bottom: 8px;
  }
  .el-form-item__label {
    font-weight: bold;
  }
  .picker-hint {
    margin: 8px 4px 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-regular);
  }
  .picker-empty {
    padding: 24px;
    text-align: center;
  }
  .servant-selector {
    padding: 0 5px;
  }
}
@media (max-width: 768px) {
  .servant-picker-dialog {
    width: calc(100vw - 16px) !important;
    height: calc(100dvh - 24px);
    margin-top: 12px !important;
  }
}
</style>
