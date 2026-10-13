import type { SlotInput } from './types';

export const isOccupiedByLock = (slot: SlotInput) =>
  slot.lockedServantId !== undefined || slot.lockedCes?.some(ce => ce && ce !== 'empty');

/**
 * 给定上场人数 K，选出要占用的本队格下标。
 * 锁定格必占；其余优先冠位（多一个免费礼装位），再按原顺序占非冠位。
 */
export const occupyLocalSlotIndices = (slots: SlotInput[], K: number): number[] => {
  const local = slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => !slot.isSupport);

  const locked = local.filter(({ slot }) => isOccupiedByLock(slot));
  const unlocked = local.filter(({ slot }) => !isOccupiedByLock(slot));
  unlocked.sort((a, b) => Number(b.slot.isCrown) - Number(a.slot.isCrown) || a.index - b.index);

  const picked = [...locked, ...unlocked].slice(0, K);
  return picked.map(({ index }) => index);
};

export const localSlotCount = (slots: SlotInput[]) => slots.filter(s => !s.isSupport).length;

export const lockedLocalCount = (slots: SlotInput[]) =>
  slots.filter(s => !s.isSupport && isOccupiedByLock(s)).length;

/** 空置约束使格位不再等价；至多六格，枚举子集保留收益及 cost 的精确性。 */
export const occupiedLayouts = (slots: SlotInput[], K: number): number[][] => {
  if (!slots.some(s => !s.isSupport && s.lockedCes?.includes('empty')))
    return [occupyLocalSlotIndices(slots, K)];
  const local = slots.flatMap((s, i) => (s.isSupport ? [] : [i]));
  const layouts: number[][] = [];
  for (let mask = 0; mask < 1 << local.length; mask++) {
    const picked = local.filter((_, i) => mask & (1 << i));
    if (picked.length !== K) continue;
    if (local.some(i => isOccupiedByLock(slots[i]!) && !picked.includes(i))) continue;
    layouts.push(picked);
  }
  return layouts;
};
