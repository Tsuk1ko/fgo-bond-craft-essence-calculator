<template>
  <el-popover
    :visible="visible"
    :width="270"
    placement="bottom-start"
    :persistent="false"
    @after-enter="focusContent"
  >
    <template #reference>
      <button
        ref="trigger"
        type="button"
        class="ce-button"
        :aria-label="`第 ${slotIndex + 1} 格礼装 ${position + 1}：${label}${locked ? '，已锁定' : ''}`"
        :aria-expanded="visible"
        aria-haspopup="dialog"
        @click="visible = !visible"
      >
        <span class="ce-strip" :class="shownCe?.kind ?? 'empty'">
          <el-icon v-if="locked" class="ce-lock" aria-hidden="true"><Lock /></el-icon>
          <span>{{ shownCe ? `+${shownCe.kind === 'generic' ? shownCe.rate : 20}%` : '—' }}</span>
        </span>
        <span class="ce-name">{{ label }}</span>
        <span v-if="slot.isCrown" class="ce-seat">{{
          position === 0 || slot.isSupport ? '免费位' : '计 cost'
        }}</span>
      </button>
    </template>
    <div
      ref="content"
      role="dialog"
      :aria-label="`选择第 ${slotIndex + 1} 格礼装 ${position + 1}`"
      class="ce-picker"
    >
      <strong>第 {{ slotIndex + 1 }} 格 · 礼装 {{ position + 1 }}</strong>
      <div class="ce-options">
        <button type="button" :aria-pressed="selection === null" @click="choose(null)">自动</button>
        <button type="button" :aria-pressed="selection === 'empty'" @click="choose('empty')">
          空置
        </button>
        <template v-for="group in groups" :key="group.name">
          <template v-if="group.items.length">
            <div class="ce-group-title">{{ group.name }}</div>
            <button
              v-for="ce in group.items"
              :key="ceKey(ce)"
              type="button"
              :aria-pressed="
                selection !== null && selection !== 'empty' && ceKey(selection) === ceKey(ce)
              "
              @click="choose(ce)"
            >
              {{ ceName(ce) }}
            </button>
          </template>
        </template>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { Lock } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { CeKind, CeLock, PlannerInput } from '@/lib/auto-team';
import { lockCe } from '@/lib/auto-team/form';
import { ceKey } from '@/lib/auto-team/pack';
import { classBonusList, getTypeName, typeList } from '@/utils/data';
import { usePickerPopover } from './usePickerPopover';

const { input, slotIndex, position, result, calculated } = defineProps<{
  input: PlannerInput;
  slotIndex: number;
  position: number;
  result?: CeKind | null;
  calculated: boolean;
}>();
const { visible, trigger, content, close, focusContent } = usePickerPopover();
const slot = computed(() => input.slots[slotIndex]!);
const selection = computed(() => slot.value.lockedCes?.[position] ?? null);
const locked = computed(() => selection.value !== null);
const shownCe = computed(() => (selection.value === 'empty' ? null : (selection.value ?? result)));
const ceName = (ce: CeKind) =>
  ce.kind === 'generic'
    ? `通用 ${ce.rate}%`
    : `${ce.kind === 'class' ? ce.className : getTypeName(ce.typeId)} · 20%`;
const label = computed(() =>
  shownCe.value
    ? ceName(shownCe.value)
    : selection.value === 'empty' || calculated
      ? '空置'
      : '锁定礼装',
);
const groups = computed(() => [
  {
    name: '职阶礼装',
    items: classBonusList
      .filter(name => slot.value.isSupport || input.ownedClassCes.includes(name))
      .map((className): CeKind => ({ kind: 'class', className })),
  },
  {
    name: '特性礼装',
    items: typeList.flatMap((_, typeId): CeKind[] =>
      slot.value.isSupport || input.ownedTraitCes.includes(typeId)
        ? [{ kind: 'trait', typeId }]
        : [],
    ),
  },
  {
    name: '通用',
    items: ([15, 10, 5] as const)
      .filter(rate => slot.value.isSupport || rate === 5 || (rate === 10 && input.ownedGeneric10))
      .map((rate): CeKind => ({ kind: 'generic', rate })),
  },
]);
const choose = (ce: CeLock) => {
  const conflict = lockCe(input, slotIndex, position, ce);
  if (conflict !== undefined) {
    ElMessage.warning(`该礼装已锁定在第 ${conflict + 1} 格`);
    return;
  }
  close();
};
</script>

<style scoped lang="scss">
.ce-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: var(--slot-face);
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  cursor: pointer;
  font: inherit;
}
.ce-strip {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  height: calc(var(--slot-face) / 3);
  border-radius: 3px 3px 0 0;
  font-size: 12px;
  color: white;
  background: #606266;
}
.ce-strip.class {
  background: linear-gradient(100deg, #475d90, #303e65);
}
.ce-strip.trait {
  background: linear-gradient(100deg, #276ea9, #1c4d79);
}
.ce-strip.generic {
  background: linear-gradient(100deg, #387650, #245137);
}
.ce-strip.empty {
  background: var(--el-fill-color-dark);
  color: var(--el-text-color-regular);
}
.ce-lock {
  position: absolute;
  left: 2px;
  top: 2px;
}
.ce-name {
  padding: 3px 2px;
  font-size: 12px;
  overflow-wrap: anywhere;
  line-height: 1.3;
}
.ce-seat {
  font-size: 12px;
  color: var(--el-text-color-regular);
  padding-bottom: 3px;
}
.ce-options {
  max-height: min(360px, 55vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 3px;
}
.ce-options button {
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
}
.ce-options button[aria-pressed='true'] {
  border: 2px solid var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  font-weight: bold;
}
.ce-group-title {
  padding: 6px 0 2px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}
</style>
