import { CE_COST, DEFAULT_QUOTA, servantCost } from './constants';
import { knapsackSelect, type KnapItem } from './knapsack';
import { lockedLocalCount, localSlotCount, occupyLocalSlotIndices } from './occupy';
import { addCopy, emptyCopies, packCraftEssences } from './pack';
import { buildVirtualPool } from './pool';
import { getResources } from './resources';
import { cmpStar, computeStarVector, pickByStar, sameStar, starVecOf, type StarVec } from './star';
import type {
  AuraCopies,
  CeKind,
  PlannedSlot,
  PlannerInput,
  PlannerResult,
  PlannerServant,
} from './types';
import { auraCountFromSlots, canGainFromLock, servantYield, totalYield } from './yield';

const subsets = <T>(arr: T[]): T[][] => {
  const out: T[][] = [[]];
  for (const x of arr) {
    const n = out.length;
    for (let i = 0; i < n; i++) out.push([...out[i]!, x]);
  }
  return out;
};

const copiesOf = (s: PlannerServant, input: PlannerInput) => {
  if (s.kind === 'real') return 1;
  if (s.kind === 'classVirtual' && s.class) {
    return input.quotaClass?.[s.class]?.[s.star] ?? DEFAULT_QUOTA;
  }
  return input.quotaGeneric?.[s.star] ?? DEFAULT_QUOTA;
};

const toCopies = (ces: CeKind[]): AuraCopies => {
  const c = emptyCopies();
  ces.forEach(ce => addCopy(c, ce));
  return c;
};

const mergeCopies = (a: AuraCopies, extra5: number): AuraCopies => ({
  trait: { ...a.trait },
  class: { ...a.class },
  generic5: a.generic5 + extra5,
  generic10: a.generic10,
  generic15: a.generic15,
});

const resolveLocked = (input: PlannerInput): PlannerServant[] => {
  const { servants } = getResources();
  return input.slots
    .filter(s => !s.isSupport && s.lockedServantId !== undefined)
    .map(s => {
      const cat = servants.find(x => x.id === s.lockedServantId);
      if (!cat) throw new Error(`auto-team: 锁定从者 ${s.lockedServantId} 不在图鉴中`);
      const commentTypes = cat.typeComments ? Object.keys(cat.typeComments).map(Number) : [];
      return {
        id: cat.id,
        kind: 'real' as const,
        class: cat.class,
        star: cat.star,
        types: [...new Set([...cat.types, ...commentTypes])],
        canGainBond: canGainFromLock(s.bond15, s.bondCap16),
      };
    });
};

const seatBudget = (input: PlannerInput, occupiedLocal: number[]) => {
  const occupied = new Set(occupiedLocal);
  let free = 0;
  let paid = 0;
  input.slots.forEach((slot, i) => {
    if (slot.isSupport) {
      const n = slot.isCrown ? 2 : 1;
      free += n;
      return;
    }
    if (!occupied.has(i)) return;
    if (slot.isCrown) {
      free += 1;
      paid += 1;
    } else {
      paid += 1;
    }
  });
  return { free, paid, total: free + paid };
};

const ceKindKey = (ce: CeKind) =>
  ce.kind === 'trait'
    ? `trait:${ce.typeId}`
    : ce.kind === 'class'
      ? `class:${ce.className}`
      : `g:${ce.rate}`;

const localPremium = (input: PlannerInput): CeKind[] => [
  ...input.ownedTraitCes.map((typeId): CeKind => ({ kind: 'trait', typeId })),
  ...input.ownedClassCes.map((className): CeKind => ({ kind: 'class', className })),
  ...(input.ownedGeneric10 ? [{ kind: 'generic' as const, rate: 10 as const }] : []),
];

const supportOptions = (input: PlannerInput, pool: PlannerServant[]): CeKind[] => {
  const traits = new Set<number>(input.ownedTraitCes);
  pool.forEach(s => s.types.forEach(t => traits.add(t)));
  const list: CeKind[] = [
    { kind: 'generic', rate: 15 },
    { kind: 'generic', rate: 10 },
    { kind: 'generic', rate: 5 },
  ];
  traits.forEach(typeId => list.push({ kind: 'trait', typeId }));
  getResources().classCeClasses.forEach(className => list.push({ kind: 'class', className }));
  return list;
};

const supportAssignments = (input: PlannerInput, pool: PlannerServant[]): CeKind[][] => {
  const support = input.slots.find(s => s.isSupport);
  if (!support) return [[]];
  const opts = supportOptions(input, pool);
  if (!support.isCrown) return opts.map(c => [c]);
  const pairs: CeKind[][] = [];
  for (const a of opts) {
    for (const b of opts) {
      if (a.kind === 'generic' && a.rate === 15 && b.kind === 'generic' && b.rate === 15) continue;
      if (ceKindKey(a) === ceKindKey(b) && !(a.kind === 'generic' && a.rate === 5)) continue;
      pairs.push([a, b]);
    }
  }
  return pairs;
};

const toItems = (
  pool: PlannerServant[],
  input: PlannerInput,
  copies: AuraCopies,
  A: number,
  excludeIds: Set<number>,
): KnapItem[] =>
  pool
    .filter(s => s.kind !== 'real' || !excludeIds.has(s.id))
    .map(s => ({
      servant: s,
      value: servantYield(s, copies, A),
      cost: servantCost(s),
      copies: copiesOf(s, input),
    }));

interface Cand {
  yield: number;
  cost: number;
  stars: StarVec;
  result: PlannerResult;
}

const better = (a: Cand, b: Cand, starPriority: boolean) => {
  if (starPriority) {
    const c = cmpStar(a.stars, b.stars);
    if (c !== 0) return c > 0;
  }
  if (a.yield !== b.yield) return a.yield > b.yield;
  return a.cost > b.cost;
};

const trySwapMashToFit = (
  rest: PlannerServant[],
  items: KnapItem[],
  budget: number,
): PlannerServant[] => {
  const mashId = getResources().mashId;
  const mash = items.find(i => i.servant.id === mashId)?.servant;
  if (!mash || rest.some(s => s.id === mashId)) return rest;
  const idx = rest.findIndex(s => s.star === 4 && servantCost(s) > 0);
  if (idx < 0) return rest;
  const next = [...rest];
  next[idx] = mash;
  return next.reduce((s, x) => s + servantCost(x), 0) <= budget ? next : rest;
};

const placeTeam = (
  input: PlannerInput,
  occupied: number[],
  locked: PlannerServant[],
  rest: PlannerServant[],
): PlannedSlot[] => {
  const lockedById = new Map(locked.map(s => [s.id, s]));
  const queue = [...rest];
  return input.slots.map((slot, slotIndex) => {
    if (slot.isSupport) return { slotIndex, servant: null, ces: [] as CeKind[] };
    if (!occupied.includes(slotIndex)) return { slotIndex, servant: null, ces: [] as CeKind[] };
    if (slot.lockedServantId !== undefined) {
      return { slotIndex, servant: lockedById.get(slot.lockedServantId) ?? null, ces: [] };
    }
    return { slotIndex, servant: queue.shift() ?? null, ces: [] };
  });
};

/**
 * 精确求解：枚举光环配置 → 从者分数线性化 → 背包或按星级取 top → 对入选队伍再打包一次礼装。
 *
 * 再打包是为了按「这支具体队伍」把高价值光环放到免费位，并补 5%。
 * 枚举扫到最优配置 C* 时，背包选出的队伍不差于最优队伍；再打包不会变差。
 */
export const solve = (input: PlannerInput): PlannerResult => {
  getResources();
  const A = auraCountFromSlots(input.slots);
  const locked = resolveLocked(input);
  const lockedIds = new Set(locked.map(s => s.id));
  const pool = buildVirtualPool(input).filter(s => s.kind !== 'real' || !lockedIds.has(s.id));

  const Kmax = localSlotCount(input.slots);
  const Kmin = lockedLocalCount(input.slots);
  const lockedCost = locked.reduce((s, x) => s + servantCost(x), 0);

  const baseItems = toItems(pool, input, emptyCopies(), A, lockedIds);
  const targetStars = input.starPriority
    ? (() => {
        const lockedStars = starVecOf(locked);
        const filled = computeStarVector(
          baseItems,
          Kmax - locked.length,
          input.costCap - lockedCost,
        );
        return filled.map((n, i) => n + lockedStars[i]!) as StarVec;
      })()
    : null;

  let best: Cand | null = null;

  for (let K = Kmin; K <= Kmax; K++) {
    if (targetStars && K !== targetStars.reduce((a, b) => a + b, 0)) continue;

    const occupied = occupyLocalSlotIndices(input.slots, K);
    const { free, total } = seatBudget(input, occupied);

    for (const local of subsets(localPremium(input))) {
      for (const support of supportAssignments(input, [...pool, ...locked])) {
        const premium = [...local, ...support];
        if (premium.length > total) continue;
        const remainSeats = Math.max(0, total - premium.length);
        for (let extra5 = 0; extra5 <= remainSeats; extra5++) {
          const placed = premium.length + extra5;
          const paid = Math.max(0, placed - free);
          const ceCost = paid * CE_COST;
          const budget = input.costCap - lockedCost - ceCost;
          if (budget < 0) continue;

          const copies = mergeCopies(toCopies(premium), extra5);
          const items = toItems(pool, input, copies, A, lockedIds);
          const needRest = K - locked.length;

          let rest: PlannerServant[] = [];
          if (needRest > 0) {
            if (targetStars) {
              const lockedStars = starVecOf(locked);
              const need = targetStars.map((n, i) => n - lockedStars[i]!) as StarVec;
              rest = pickByStar(items, need);
              if (rest.length !== needRest) continue;
              const restCost = rest.reduce((s, x) => s + servantCost(x), 0);
              if (restCost > budget) {
                rest = trySwapMashToFit(rest, items, budget);
                if (rest.reduce((s, x) => s + servantCost(x), 0) > budget) continue;
              }
            } else {
              const picked = knapsackSelect(items, needRest, budget);
              rest = picked.servants;
            }
          }

          const team = [...locked, ...rest];
          if (targetStars && !sameStar(starVecOf(team), targetStars)) continue;

          const actualOccupied = occupyLocalSlotIndices(input.slots, team.length);
          const packed = packCraftEssences({
            slots: input.slots,
            occupiedLocalIndices: actualOccupied,
            servantCostSum: team.reduce((s, x) => s + servantCost(x), 0),
            costCap: input.costCap,
            ownedTraitCes: input.ownedTraitCes,
            ownedClassCes: input.ownedClassCes,
            ownedGeneric10: input.ownedGeneric10,
            team,
          });
          const yieldSum = totalYield(team, packed.copies, A);
          const usedCost = team.reduce((s, x) => s + servantCost(x), 0) + packed.ceCost;

          const slots = placeTeam(input, actualOccupied, locked, rest).map((row, i) => ({
            ...row,
            ces: packed.placements[i] ?? [],
          }));

          const cand: Cand = {
            yield: yieldSum,
            cost: usedCost,
            stars: starVecOf(team),
            result: { slots, totalYield: yieldSum, usedCost },
          };
          if (!best || better(cand, best, input.starPriority)) best = cand;
        }
      }
    }
  }

  return (
    best?.result ?? {
      slots: input.slots.map((_, slotIndex) => ({ slotIndex, servant: null, ces: [] })),
      totalYield: 0,
      usedCost: 0,
    }
  );
};
