<template>
  <section class="team-slot" :aria-label="`第 ${index + 1} 格`">
    <div class="slot-heading">
      <b>{{ index + 1 }}</b>
      <div class="slot-status">
        <span v-if="slot.isSupport">助战</span><span v-if="slot.isCrown">冠位</span
        ><span v-if="slot.bond15">羁绊15</span><span v-if="slot.bondCap16">开16</span>
      </div>
    </div>
    <button
      class="servant-button"
      type="button"
      :aria-label="`第 ${index + 1} 格${slot.isSupport ? '助战，不选择从者' : `从者：${name}${slot.lockedServantId !== undefined ? '，已锁定' : ''}`}`"
      :aria-disabled="slot.isSupport"
      @click="selectServant"
    >
      <ServantImg
        v-if="servant && !slot.isSupport"
        :id="servant.id"
        :name="name"
        :virtual-class="servant.kind === 'real' ? undefined : servant.class"
      />
      <img
        v-else
        :src="slot.isSupport ? 'assets/other/unknown-servant.webp' : 'assets/other/empty.webp'"
        alt=""
      />
      <span v-if="slot.lockedServantId !== undefined && !slot.isSupport" class="lock-corner"
        ><el-icon aria-hidden="true"><Lock /></el-icon
      ></span>
      <span v-if="!servant || slot.isSupport" class="empty-label">{{
        slot.isSupport ? '助战' : calculated ? '未上场' : '锁定从者'
      }}</span>
    </button>
    <div v-if="servant && !slot.isSupport" class="servant-name">
      {{ name }}<span class="servant-star">★{{ servant.star }}</span>
    </div>
    <div class="slot-ces">
      <CePickerPopover
        v-for="pos in slot.isCrown ? 2 : 1"
        :key="pos"
        :input="input"
        :slot-index="index"
        :position="pos - 1"
        :result="result?.ces[pos - 1]"
        :calculated="calculated"
      />
    </div>
    <el-popover
      :visible="visible"
      :width="260"
      placement="bottom-start"
      :persistent="false"
      @after-enter="focusContent"
    >
      <template #reference>
        <button
          ref="trigger"
          type="button"
          class="settings-button"
          :aria-label="`第 ${index + 1} 格设置`"
          :aria-expanded="visible"
          aria-haspopup="dialog"
          @click="visible = !visible"
        >
          <el-icon aria-hidden="true"><Setting /></el-icon>
        </button>
      </template>
      <div ref="content" class="slot-settings" role="dialog" :aria-label="`第 ${index + 1} 格设置`">
        <strong>第 {{ index + 1 }} 格设置</strong>
        <div>
          <span>助战</span
          ><el-switch
            :model-value="slot.isSupport"
            aria-label="助战"
            @change="changeSupport(Boolean($event))"
          />
        </div>
        <div>
          <span>冠位</span
          ><el-switch
            :model-value="slot.isCrown"
            aria-label="冠位"
            @change="changeCrown(Boolean($event))"
          />
        </div>
        <div>
          <span>羁绊15</span
          ><el-switch
            :model-value="Boolean(slot.bond15)"
            :disabled="!canSetBond"
            aria-label="羁绊15"
            @change="changeBond(Boolean($event))"
          />
        </div>
        <div>
          <span>开放16上限</span
          ><el-switch
            v-model="slot.bondCap16"
            :disabled="!canSetBond || !slot.bond15"
            aria-label="开放16上限"
          />
        </div>
        <p v-if="!canSetBond">
          {{ slot.isSupport ? '助战格不选择从者，仅规划礼装。' : '锁定从者后可设置羁绊15。' }}
        </p>
        <p v-else>羁绊15提供全队 +25% 光环；未开放16上限时，该从者自身不可获羁绊。</p>
      </div>
    </el-popover>
  </section>
</template>

<script setup lang="ts">
import { Lock, Setting } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import type { PlannedSlot, PlannerInput, PlannerServant } from '@/lib/auto-team';
import { setCrown, setSupport } from '@/lib/auto-team/form';
import { servantMap } from '@/utils/data';
import ServantImg from '../ServantImg.vue';
import CePickerPopover from './CePickerPopover.vue';
import { usePickerPopover } from './usePickerPopover';

const { input, index, result, calculated } = defineProps<{
  input: PlannerInput;
  index: number;
  result?: PlannedSlot;
  calculated: boolean;
}>();
const emit = defineEmits<{ selectServant: [index: number, trigger: HTMLElement] }>();
const { visible, trigger, content, focusContent } = usePickerPopover();
const slot = computed(() => input.slots[index]!);
const canSetBond = computed(
  () => !slot.value.isSupport && slot.value.lockedServantId !== undefined,
);
const servant = computed<PlannerServant | null>(() => {
  const locked =
    slot.value.lockedServantId !== undefined ? servantMap[slot.value.lockedServantId] : undefined;
  return locked
    ? { ...locked, kind: 'real', canGainBond: !slot.value.bond15 || Boolean(slot.value.bondCap16) }
    : (result?.servant ?? null);
});
const name = computed(() => {
  const s = servant.value;
  if (!s) return '锁定从者';
  return s.kind === 'real'
    ? (servantMap[s.id]?.name ?? `从者 ${s.id}`)
    : s.kind === 'classVirtual'
      ? `${s.class} 虚拟从者`
      : '通用虚拟从者';
});
const selectServant = (event: MouseEvent) => {
  if (!slot.value.isSupport) emit('selectServant', index, event.currentTarget as HTMLElement);
};
const changeSupport = (enabled: boolean) => {
  const removed = setSupport(input, index, enabled);
  if (removed) ElMessage.info(`已解除 ${removed} 项不适用于当前助战设置的锁定`);
};
const changeCrown = (enabled: boolean) => {
  if (setCrown(slot.value, enabled)) ElMessage.info('已清除第二张锁定礼装');
};
const changeBond = (enabled: boolean) => {
  slot.value.bond15 = enabled;
  if (!enabled) slot.value.bondCap16 = false;
};
</script>

<style scoped lang="scss">
.team-slot {
  --servant-img-size: var(--slot-face);
  position: relative;
  width: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.slot-heading {
  display: flex;
  align-items: flex-start;
  width: 100%;
  padding-right: 28px;
  min-height: 44px;
  gap: 5px;
}
.slot-heading b {
  padding-top: 13px;
}
.slot-status {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 10px 0 4px;
}
.slot-status span {
  white-space: nowrap;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  color: #225b96;
  border-radius: 3px;
  padding: 1px 3px;
  font-size: 12px;
}
.settings-button {
  position: absolute;
  right: -8px;
  top: 0;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: #3375b9;
  font-size: 18px;
  cursor: pointer;
}
.servant-button {
  width: var(--slot-face);
  height: var(--slot-face);
  border: 0;
  padding: 0;
  position: relative;
  background: var(--el-fill-color);
  cursor: pointer;
}
.servant-button[aria-disabled='true'] {
  cursor: default;
}
.servant-button > img,
.servant-button :deep(.servant-img__img) {
  display: block;
  width: var(--slot-face);
  height: var(--slot-face);
  object-fit: cover;
}
.empty-label {
  position: absolute;
  inset: auto 0 0;
  background: #303133de;
  color: white;
  font-size: 12px;
  line-height: 20px;
}
.lock-corner {
  position: absolute;
  left: 0;
  top: 0;
  width: 28px;
  height: 28px;
  padding: 2px;
  background: linear-gradient(135deg, #1e5790 0 50%, transparent 51%);
  color: white;
  text-align: left;
}
.servant-name {
  width: 100%;
  font-size: 12px;
  text-align: center;
  overflow-wrap: anywhere;
  line-height: 1.4;
}
.servant-star {
  display: block;
  color: var(--el-text-color-regular);
}
.slot-ces {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.slot-settings > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 38px;
}
.slot-settings p {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  margin-bottom: 0;
}
@media (max-width: 768px) {
  .team-slot {
    width: 100%;
    min-width: 0;
  }
  .settings-button {
    right: -5px;
  }
}
</style>
