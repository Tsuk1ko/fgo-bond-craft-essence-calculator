<template>
  <main class="team-page">
    <section class="team-settings" aria-label="基础设置">
      <el-form v-show="!collapsed" label-width="auto" @submit.prevent>
        <el-form-item label="队伍位置"
          ><el-input-number
            :model-value="form.slots.length"
            :min="3"
            :max="6"
            :precision="0"
            aria-label="队伍位置"
            @update:model-value="changeCount($event ?? 6)"
        /></el-form-item>
        <el-form-item label="cost 上限"
          ><el-input-number
            :model-value="form.costCap"
            :min="56"
            :max="118"
            :precision="0"
            aria-label="cost 上限"
            @update:model-value="form.costCap = $event ?? 113"
        /></el-form-item>
        <el-form-item label="设置"
          ><CheckTag v-model:checked="form.starPriority">星级优先</CheckTag></el-form-item
        >
        <el-form-item label="礼装库存">
          <div class="inventory-tags">
            <CheckTag
              v-for="name in classBonusList"
              :key="name"
              :checked="form.ownedClassCes.includes(name)"
              @change="toggleInventory(form.ownedClassCes, name)"
              >{{ name }}</CheckTag
            >
            <CheckTag
              v-for="(name, id) in typeList"
              :key="id"
              :checked="form.ownedTraitCes.includes(id)"
              @change="toggleInventory(form.ownedTraitCes, id)"
              >{{ name }}</CheckTag
            >
            <CheckTag v-model:checked="form.ownedGeneric10">通用 10%</CheckTag>
            <span class="helper">5% 无限 · 15% 仅助战</span>
            <el-popconfirm
              title="确定要清除礼装库存吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="clearInventory"
              ><template #reference><ClearBtn /></template
            ></el-popconfirm>
          </div>
        </el-form-item>
        <el-form-item label="更多">
          <el-button
            link
            type="primary"
            :aria-expanded="advanced"
            aria-controls="team-advanced"
            @click="advanced = !advanced"
            >{{ advanced ? '收起从者池与配额' : '从者池与虚拟从者配额'
            }}<el-icon><ArrowUp v-if="advanced" /><ArrowDown v-else /></el-icon
          ></el-button>
        </el-form-item>
        <div v-show="advanced" id="team-advanced">
          <el-form-item label="从者池">
            <div class="pool-filters">
              <ClassFilter :selected="selectedClasses" /><StarFilter
                :selected="selectedStars"
              /><span class="helper"
                >空选 = 不限制。共用查看器隐藏名单（{{
                  settings.hideServants.size
                }}
                名），仅限制自动上场。</span
              >
            </div>
          </el-form-item>
          <el-form-item label="虚拟从者">
            <div class="quota-settings">
              <el-button
                link
                type="primary"
                :aria-expanded="quotasExpanded"
                aria-controls="team-quotas"
                @click="quotasExpanded = !quotasExpanded"
                >{{ quotasExpanded ? '收起配额表' : '展开配额表' }}</el-button
              >
              <span class="helper">默认每档 6 名</span>
              <QuotaMatrix v-if="quotasExpanded" id="team-quotas" :input="form" />
            </div>
          </el-form-item>
        </div>
      </el-form>
      <div class="collapse-row">
        <el-button link type="primary" :aria-expanded="!collapsed" @click="collapsed = !collapsed"
          >{{ collapsed ? '展开基础设置' : '收起'
          }}<el-icon><ArrowDown v-if="collapsed" /><ArrowUp v-else /></el-icon
        ></el-button>
      </div>
    </section>
    <div class="action-bar">
      <el-button
        type="primary"
        :loading="calculating"
        :disabled="calculating"
        :aria-busy="calculating"
        @click="start"
        >{{ calculating ? '配队中' : '开始配队' }}</el-button
      >
      <div class="team-metrics" aria-live="polite" aria-atomic="true">
        <span
          >羁绊收益 <b>{{ result ? `${result.totalYield}%` : '—' }}</b></span
        >
        <span
          >已用 cost
          <b>{{ result ? `${result.usedCost} / ${resultInput!.costCap}` : '—' }}</b></span
        >
        <el-tag v-if="stale" type="warning" size="small">过期</el-tag>
      </div>
    </div>
    <section class="board-section" aria-label="配队板">
      <p class="board-hint">
        {{
          stale
            ? '条件已改变，请重新配队。下方自动填入与收益为上次结果。'
            : '点击从者或礼装可锁定；带锁图标表示锁定，其余由配队自动填入。'
        }}
      </p>
      <div class="team-board">
        <TeamSlot
          v-for="(slot, index) in form.slots"
          :key="index"
          :input="form"
          :index="index"
          :result="result?.slots[index]"
          :calculated="Boolean(result)"
          @select-servant="openServantPicker"
        />
      </div>
    </section>
    <ServantPickerDialog
      v-if="dialogSlot !== null"
      :input="form"
      :index="dialogSlot"
      @closed="closeServantPicker"
    />
  </main>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import QuotaMatrix from '@/components/auto-team/QuotaMatrix.vue';
import TeamSlot from '@/components/auto-team/TeamSlot.vue';
import { useTeamSolver } from '@/components/auto-team/useTeamSolver';
import CheckTag from '@/components/CheckTag.vue';
import ClassFilter from '@/components/ClassFilter.vue';
import ClearBtn from '@/components/ClearBtn.vue';
import StarFilter from '@/components/StarFilter.vue';
import type { PlannerInput } from '@/lib/auto-team';
import { plannerResources } from '@/lib/auto-team/catalog';
import { createPlannerInput, reconcileCeLocks, resizeSlots } from '@/lib/auto-team/form';
import { useSettingsStore } from '@/stores/settings';
import { classBonusList, typeList } from '@/utils/data';

const ServantPickerDialog = defineAsyncComponent(
  () => import('@/components/auto-team/ServantPickerDialog.vue'),
);
const settings = useSettingsStore();
const form = reactive(createPlannerInput(plannerResources));
const selectedClasses = ref(new Set<string>());
const selectedStars = ref(new Set<number>());
const input = computed<PlannerInput>(() => ({
  ...form,
  selectedClasses: [...selectedClasses.value],
  selectedStars: [...selectedStars.value],
  hiddenIds: [...settings.hideServants],
}));
const { calculating, result, resultInput, stale, start } = useTeamSolver(input);
const collapsed = ref(false);
const advanced = ref(false);
const quotasExpanded = ref(false);
const dialogSlot = ref<number | null>(null);
let dialogTrigger: HTMLElement | undefined;
const openServantPicker = (index: number, trigger: HTMLElement) => {
  dialogSlot.value = index;
  dialogTrigger = trigger;
};
const closeServantPicker = () => {
  dialogSlot.value = null;
  dialogTrigger?.focus();
};
const changeCount = (count: number) => {
  if (resizeSlots(form, count)) ElMessage.info('已清除移除格位中的锁定');
};
const toggleInventory = <T,>(items: T[], value: T) => {
  const index = items.indexOf(value);
  if (index < 0) items.push(value);
  else items.splice(index, 1);
};
const clearInventory = () => {
  form.ownedClassCes = [];
  form.ownedTraitCes = [];
  form.ownedGeneric10 = false;
};
watch(
  () => JSON.stringify([form.ownedClassCes, form.ownedTraitCes, form.ownedGeneric10]),
  () => {
    const removed = reconcileCeLocks(form);
    if (removed) ElMessage.info(`已解除 ${removed} 张不在库存中的本队礼装锁定`);
  },
);
</script>

<style scoped lang="scss">
.team-page {
  --slot-face: 80px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.team-settings {
  padding: 0 var(--page-x-padding);
}
.team-settings :deep(.el-form-item) {
  margin-bottom: 8px;
}
.team-settings :deep(.el-form-item__label) {
  font-weight: bold;
}
.team-settings :deep(.el-form-item__content) {
  min-width: 0;
  line-height: normal;
}
.inventory-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.pool-filters,
.quota-settings {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.helper,
.board-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}
.collapse-row {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 4px;
}
.action-bar {
  position: sticky;
  top: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 10px var(--page-x-padding);
  background: var(--el-bg-color, white);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.team-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.team-metrics b {
  display: inline-block;
  min-width: 3ch;
}
.board-section {
  padding: 0 var(--page-x-padding) var(--page-y-padding);
}
.board-hint {
  margin: 12px 0;
}
.team-board {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 20px 16px;
}
@media (max-width: 768px) {
  .team-page {
    --slot-face: 64px;
  }
  .action-bar > .el-button {
    width: 100%;
  }
  .team-metrics {
    font-size: 12px;
    gap: 6px 12px;
  }
  .team-board {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px 12px;
  }
}
</style>
