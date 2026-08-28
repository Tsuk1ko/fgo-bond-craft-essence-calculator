import {
  CE_COST,
  CLASS_CE_RATE,
  GENERIC_10_RATE,
  GENERIC_15_RATE,
  GENERIC_5_RATE,
  TRAIT_CE_RATE,
} from './constants';
import type { AuraCopies, CeKind, PlannerServant, SlotInput } from './types';

export interface PackArgs {
  slots: SlotInput[];
  occupiedLocalIndices: number[];
  servantCostSum: number;
  costCap: number;
  ownedTraitCes: number[];
  ownedClassCes: string[];
  ownedGeneric10: boolean;
  team: PlannerServant[];
}

export interface PackResult {
  /** 与 slots 等长，每格 1～2 个礼装位 */
  placements: Array<Array<CeKind | null>>;
  copies: AuraCopies;
  ceCost: number;
}

interface CeSeat {
  slotIndex: number;
  pos: number;
  free: boolean;
  support: boolean;
}

export const emptyCopies = (): AuraCopies => ({
  trait: {},
  class: {},
  generic5: 0,
  generic10: 0,
  generic15: 0,
});

export const addCopy = (copies: AuraCopies, ce: CeKind) => {
  if (ce.kind === 'trait') {
    copies.trait[ce.typeId] = (copies.trait[ce.typeId] ?? 0) + 1;
  } else if (ce.kind === 'class') {
    copies.class[ce.className] = (copies.class[ce.className] ?? 0) + 1;
  } else if (ce.rate === 5) copies.generic5 += 1;
  else if (ce.rate === 10) copies.generic10 += 1;
  else copies.generic15 += 1;
};

const ceKey = (ce: CeKind) =>
  ce.kind === 'trait'
    ? `trait:${ce.typeId}`
    : ce.kind === 'class'
      ? `class:${ce.className}`
      : `g:${ce.rate}`;

/** 这张礼装对当前本队的百分点价值（全队光环 × 吃到的人数）。 */
const ceValue = (ce: CeKind, team: PlannerServant[]): number => {
  const G = team.filter(s => s.canGainBond).length;
  if (ce.kind === 'generic') {
    const rate =
      ce.rate === 5 ? GENERIC_5_RATE : ce.rate === 10 ? GENERIC_10_RATE : GENERIC_15_RATE;
    return rate * G;
  }
  if (ce.kind === 'class') {
    return CLASS_CE_RATE * team.filter(s => s.canGainBond && s.class === ce.className).length;
  }
  return TRAIT_CE_RATE * team.filter(s => s.canGainBond && s.types.includes(ce.typeId)).length;
};

const capacity = (slot: SlotInput, occupied: boolean) => {
  if (slot.isSupport) return slot.isCrown ? 2 : 1;
  if (!occupied) return 0;
  return slot.isCrown ? 2 : 1;
};

const isFreeSeat = (slot: SlotInput, pos: number) => {
  if (slot.isSupport) return true;
  return slot.isCrown && pos === 0;
};

/**
 * 列出已占格上的礼装位：助战全免费；冠位第一张免费；其余付费 16。
 */
const listSeats = (slots: SlotInput[], occupiedLocal: Set<number>): CeSeat[] => {
  const seats: CeSeat[] = [];
  slots.forEach((slot, slotIndex) => {
    const occupied = slot.isSupport || occupiedLocal.has(slotIndex);
    const n = capacity(slot, occupied);
    for (let pos = 0; pos < n; pos++) {
      seats.push({
        slotIndex,
        pos,
        free: isFreeSeat(slot, pos),
        support: slot.isSupport,
      });
    }
  });
  return seats;
};

/**
 * 固定队伍后的最优打包。
 * 价值高的光环优先进免费位，再进付费位；付费位受剩余 cost 约束。
 * 5% 填所有仍空着的位（免费位也填）。锁定礼装先钉死。
 */
export const packCraftEssences = ({
  slots,
  occupiedLocalIndices,
  servantCostSum,
  costCap,
  ownedTraitCes,
  ownedClassCes,
  ownedGeneric10,
  team,
}: PackArgs): PackResult => {
  const occupiedLocal = new Set(occupiedLocalIndices);
  const seats = listSeats(slots, occupiedLocal);
  const placed: Array<Array<CeKind | null>> = slots.map((slot, i) => {
    const n = capacity(slot, slot.isSupport || occupiedLocal.has(i));
    return Array.from({ length: n }, () => null);
  });

  const copies = emptyCopies();
  let ceCost = 0;
  let budget = costCap - servantCostSum;

  const localUsed = new Set<string>();
  const supportUsed = new Set<string>();
  let used15 = false;

  const occupySeat = (seat: CeSeat, ce: CeKind) => {
    placed[seat.slotIndex]![seat.pos] = ce;
    addCopy(copies, ce);
    if (!seat.free) {
      ceCost += CE_COST;
      budget -= CE_COST;
    }
    if (seat.support) supportUsed.add(ceKey(ce));
    else localUsed.add(ceKey(ce));
    if (ce.kind === 'generic' && ce.rate === 15) used15 = true;
  };

  // 锁定礼装先占位
  for (const seat of seats) {
    const locked = slots[seat.slotIndex]?.lockedCes?.[seat.pos];
    if (!locked) continue;
    occupySeat(seat, locked);
  }

  const canUse = (ce: CeKind, seat: CeSeat): boolean => {
    if (ce.kind === 'generic' && ce.rate === 15) {
      return seat.support && !used15;
    }
    if (ce.kind === 'generic' && ce.rate === 10) {
      if (seat.support) return !supportUsed.has(ceKey(ce));
      return ownedGeneric10 && !localUsed.has(ceKey(ce));
    }
    if (ce.kind === 'generic' && ce.rate === 5) return true;
    if (seat.support) return !supportUsed.has(ceKey(ce));
    if (ce.kind === 'trait') {
      return ownedTraitCes.includes(ce.typeId) && !localUsed.has(ceKey(ce));
    }
    if (ce.kind === 'class') {
      return ownedClassCes.includes(ce.className) && !localUsed.has(ceKey(ce));
    }
    return false;
  };

  const catalog: CeKind[] = [
    ...ownedTraitCes.map((typeId): CeKind => ({ kind: 'trait', typeId })),
    ...ownedClassCes.map((className): CeKind => ({ kind: 'class', className })),
    ...(ownedGeneric10 ? [{ kind: 'generic' as const, rate: 10 as const }] : []),
    { kind: 'generic', rate: 15 },
    { kind: 'generic', rate: 5 },
  ];

  const emptySeats = () => seats.filter(s => placed[s.slotIndex]![s.pos] === null);
  const byValue = [...catalog].sort((a, b) => ceValue(b, team) - ceValue(a, team));

  // 免费位先填高价值（不含 5%，留给最后铺满）
  const premium = byValue.filter(ce => !(ce.kind === 'generic' && ce.rate === 5));
  for (const seat of emptySeats().filter(s => s.free)) {
    const ce = premium.find(c => canUse(c, seat) && ceValue(c, team) > 0);
    if (ce) occupySeat(seat, ce);
  }

  // 付费位：剩余 cost 够 16 且价值 > 0
  for (const seat of emptySeats().filter(s => !s.free)) {
    if (budget < CE_COST) break;
    const ce = premium.find(c => canUse(c, seat) && ceValue(c, team) > 0);
    if (ce) occupySeat(seat, ce);
  }

  // 剩余空位（含免费）一律 5%
  for (const seat of emptySeats()) {
    if (!seat.free && budget < CE_COST) continue;
    occupySeat(seat, { kind: 'generic', rate: 5 });
  }

  return { placements: placed, copies, ceCost };
};
