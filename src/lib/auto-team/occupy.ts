import type { SlotInput } from './types';

const isLocked = (slot: SlotInput) =>
  slot.lockedServantId !== undefined || slot.lockedCes?.some(Boolean);

/**
 * 给定上场人数 K，选出要占用的本队格下标。
 * 锁定格必占；其余优先冠位（多一个免费礼装位），再按原顺序占非冠位。
 */
export const occupyLocalSlotIndices = (slots: SlotInput[], K: number): number[] => {
  const local = slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => !slot.isSupport);

  const locked = local.filter(({ slot }) => isLocked(slot));
  const unlocked = local.filter(({ slot }) => !isLocked(slot));
  unlocked.sort((a, b) => Number(b.slot.isCrown) - Number(a.slot.isCrown) || a.index - b.index);

  const picked = [...locked, ...unlocked].slice(0, K);
  return picked.map(({ index }) => index);
};

export const localSlotCount = (slots: SlotInput[]) => slots.filter(s => !s.isSupport).length;

export const lockedLocalCount = (slots: SlotInput[]) =>
  slots.filter(s => !s.isSupport && isLocked(s)).length;
