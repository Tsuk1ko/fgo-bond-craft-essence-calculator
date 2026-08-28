import {
  BASE_YIELD,
  BOND15_RATE,
  CLASS_CE_RATE,
  GENERIC_10_RATE,
  GENERIC_15_RATE,
  GENERIC_5_RATE,
  TRAIT_CE_RATE,
} from './constants';
import type { AuraCopies, PlannerServant } from './types';

/**
 * 单名本队从者的羁绊收益（百分点）。
 * 助战不走进这个函数。礼装是全队光环：谁戴无关，按 copies 张数叠。
 */
export const servantYield = (s: PlannerServant, copies: AuraCopies, A: number): number => {
  if (!s.canGainBond) return 0;

  let aura = 0;
  for (const [typeId, n] of Object.entries(copies.trait)) {
    if (n && s.types.includes(Number(typeId))) aura += TRAIT_CE_RATE * n;
  }
  if (s.class) {
    const n = copies.class[s.class] ?? 0;
    aura += CLASS_CE_RATE * n;
  }
  aura += GENERIC_5_RATE * copies.generic5;
  aura += GENERIC_10_RATE * copies.generic10;
  aura += GENERIC_15_RATE * copies.generic15;

  return BASE_YIELD + aura + BOND15_RATE * A;
};

export const totalYield = (team: PlannerServant[], copies: AuraCopies, A: number): number =>
  team.reduce((sum, s) => sum + servantYield(s, copies, A), 0);

/** 从锁定格统计羁绊15 光环人数 A。 */
export const auraCountFromSlots = (
  slots: Array<{ lockedServantId?: number; bond15?: boolean }>,
): number => slots.filter(s => s.lockedServantId !== undefined && s.bond15).length;

/** 锁定从者是否可获羁绊：羁绊15 且未开 16 则不可。 */
export const canGainFromLock = (bond15?: boolean, bondCap16?: boolean): boolean => {
  if (bond15 && !bondCap16) return false;
  return true;
};
