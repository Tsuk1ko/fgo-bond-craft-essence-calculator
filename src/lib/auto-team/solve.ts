import {
  BASE_YIELD,
  BOND15_RATE,
  CE_COST,
  CLASS_CE_RATE,
  DEFAULT_QUOTA,
  GENERIC_5_RATE,
  GENERIC_10_RATE,
  GENERIC_15_RATE,
  servantCost,
  TRAIT_CE_RATE,
} from './constants';
import { prepareKnapsack } from './knapsack';
import type { KnapItem, KnapResult } from './knapsack';
import { localSlotCount, lockedLocalCount, occupyLocalSlotIndices } from './occupy';
import { ceKey, generic5, placeEquipment, prepareEquipment } from './pack';
import type { Equipment } from './pack';
import { buildVirtualPool } from './pool';
import { getResources } from './resources';
import { computeStarVector, prepareStarPicks } from './star';
import type { CeKind, PlannerInput, PlannerResult, PlannerServant } from './types';
import { auraCountFromSlots, canGainFromLock, totalYield } from './yield';

const subsets = (items: CeKind[], limit: number) => {
  const out: CeKind[][] = [[]];
  for (const item of items) {
    const n = out.length;
    for (let i = 0; i < n; i++) if (out[i]!.length < limit) out.push([...out[i]!, item]);
  }
  return out;
};

const supportAssignments = (equipment: Equipment) => {
  const n = equipment.support.length;
  if (!n) return [[]];
  const options = equipment.supportOptions;
  if (n === 1) return options.map(c => [c]);
  const pairs: CeKind[][] = [];
  for (let i = 0; i < options.length; i++) {
    for (let j = i; j < options.length; j++) {
      const a = options[i]!;
      const b = options[j]!;
      if (i === j && !(a.kind === 'generic' && a.rate === 5)) continue;
      pairs.push([a, b]);
    }
  }
  return pairs;
};

const copiesOf = (s: PlannerServant, input: PlannerInput) =>
  Math.min(
    6,
    s.kind === 'real'
      ? 1
      : s.kind === 'classVirtual' && s.class
        ? (input.quotaClass?.[s.class]?.[s.star] ?? DEFAULT_QUOTA)
        : (input.quotaGeneric?.[s.star] ?? DEFAULT_QUOTA),
  );

const validateInput = (input: PlannerInput) => {
  if (
    !Number.isInteger(input.costCap) ||
    input.costCap < 0 ||
    input.costCap > 118 ||
    input.slots.length < 1 ||
    input.slots.length > 6 ||
    input.slots.filter(s => s.isSupport).length > 1
  )
    throw new Error('auto-team: 非法队伍范围或 cost');
  for (const quota of [input.quotaGeneric, ...Object.values(input.quotaClass ?? {})]) {
    for (const n of Object.values(quota ?? {}))
      if (n !== undefined && (!Number.isInteger(n) || n < 0))
        throw new Error('auto-team: 配额须为非负整数');
  }
  const localIds = input.slots
    .filter(s => !s.isSupport && s.lockedServantId !== undefined)
    .map(s => s.lockedServantId!);
  if (new Set(localIds).size !== localIds.length)
    throw new Error('auto-team: 同一真从者不能重复锁定');
  if (input.slots.some(s => (s.bond15 || s.bondCap16) && s.lockedServantId === undefined))
    throw new Error('auto-team: 羁绊状态需要锁定从者');
};

/** 合法光环枚举 + 精确人数选人。固定光环的配置保留放置见证，不再逐候选重新打包。 */
export const solve = (input: PlannerInput): PlannerResult => {
  const resources = getResources();
  validateInput(input);
  const lockedBySlot = new Map<number, PlannerServant>();
  input.slots.forEach((slot, index) => {
    if (slot.isSupport || slot.lockedServantId === undefined) return;
    const s = resources.servants.find(s => s.id === slot.lockedServantId);
    if (!s) throw new Error('auto-team: 锁定从者不在图鉴');
    lockedBySlot.set(index, {
      id: s.id,
      kind: 'real',
      class: s.class,
      star: s.star,
      types: [...new Set([...s.types, ...Object.keys(s.typeComments ?? {}).map(Number)])],
      canGainBond: canGainFromLock(slot.bond15, slot.bondCap16),
    });
  });
  const locked = [...lockedBySlot.values()];
  const lockedIds = new Set(locked.map(s => s.id));
  const pool = buildVirtualPool(input).filter(s => s.kind !== 'real' || !lockedIds.has(s.id));
  if ([...pool, ...locked].some(s => !Number.isInteger(s.star) || s.star < 0 || s.star > 5))
    throw new Error('auto-team: 非法从者星级');
  const Kmax = localSlotCount(input.slots);
  const Kmin = lockedLocalCount(input.slots);
  const maxRest = Kmax - locked.length;
  const fullEquipment = prepareEquipment({
    ...input,
    occupiedLocalIndices: occupyLocalSlotIndices(input.slots, Kmax),
  });
  const lockedCost = locked.reduce((sum, s) => sum + servantCost(s), 0);
  const remaining = input.costCap - lockedCost - fullEquipment.ceCost;
  if (remaining < 0) throw new Error('auto-team: 锁定配置超出 cost 上限');
  const baseItems: KnapItem[] = pool.map(servant => ({
    servant,
    cost: servantCost(servant),
    copies: copiesOf(servant, input),
    value: 0,
  }));
  const target = input.starPriority
    ? computeStarVector(baseItems, maxRest, remaining, Kmin - locked.length)
    : null;
  if (input.starPriority && !target) throw new Error('auto-team: 无法满足锁定条件');
  const layouts: Array<{ K: number; occupied: number[]; equipment: Equipment }> = [];
  for (let K = Kmin; K <= Kmax; K++) {
    if (target && K !== locked.length + target.reduce((sum, n) => sum + n, 0)) continue;
    const occupied = occupyLocalSlotIndices(input.slots, K);
    layouts.push({
      K,
      occupied,
      equipment: prepareEquipment({ ...input, occupiedLocalIndices: occupied }),
    });
  }

  // 相同选择性光环分组处理一次，通用光环只改变常量及预算，避免缓存大量背包表。
  const selective = new Map<string, CeKind>();
  for (const ce of [
    ...fullEquipment.localOptions,
    ...fullEquipment.supportOptions,
    ...fullEquipment.placements.flat().filter((c): c is CeKind => c !== null),
  ]) {
    if (ce.kind !== 'generic') selective.set(ceKey(ce), ce);
  }
  const kinds = [...selective.values()];
  const indexOf = new Map(kinds.map((ce, i) => [ceKey(ce), i]));
  const fixed = kinds.map(ce =>
    ce.kind === 'trait'
      ? (fullEquipment.copies.trait[ce.typeId] ?? 0)
      : ce.kind === 'class'
        ? (fullEquipment.copies.class[ce.className] ?? 0)
        : 0,
  );
  interface Variant {
    local: CeKind[];
    support: CeKind[];
    generic: number;
  }
  const configurations = new Map<string, { counts: number[]; variants: Variant[] }>();
  const localOptions = fullEquipment.localOptions.filter(
    ce => !(ce.kind === 'generic' && ce.rate === 5),
  );
  const supports = supportAssignments(fullEquipment);
  const maxLocal = Math.max(
    ...layouts.map(
      l =>
        l.equipment.localFree.length +
        Math.min(l.equipment.localPaid.length, Math.floor(remaining / CE_COST)),
    ),
  );
  for (const local of subsets(localOptions, maxLocal)) {
    for (const support of supports) {
      const counts = [...fixed];
      let generic = 0;
      for (const ce of [...local, ...support]) {
        if (ce.kind === 'generic') generic += ce.rate;
        else counts[indexOf.get(ceKey(ce))!]++;
      }
      const key = counts.join(',');
      let config = configurations.get(key);
      if (!config) {
        config = { counts, variants: [] };
        configurations.set(key, config);
      }
      config.variants.push({ local, support, generic });
    }
  }
  const matches = kinds.map(ce =>
    [...pool, ...locked].map(
      s =>
        Number(
          s.canGainBond &&
            (ce.kind === 'trait'
              ? s.types.includes(ce.typeId)
              : ce.kind === 'class' && s.class === ce.className),
        ) * (ce.kind === 'trait' ? TRAIT_CE_RATE : CLASS_CE_RATE),
    ),
  );
  const A = auraCountFromSlots(input.slots);
  const fixedGeneric =
    fullEquipment.copies.generic5 * GENERIC_5_RATE +
    fullEquipment.copies.generic10 * GENERIC_10_RATE +
    fullEquipment.copies.generic15 * GENERIC_15_RATE;
  const capped = locked.filter(s => !s.canGainBond).length;
  interface Best {
    value: number;
    cost: number;
    picked: KnapResult;
    layout: (typeof layouts)[number];
    variant: Variant;
    extra5: number;
  }
  let best: Best | undefined;
  for (const config of configurations.values()) {
    const scores = new Float64Array(pool.length + locked.length);
    config.counts.forEach((count, c) => {
      if (count)
        matches[c]!.forEach((value, i) => {
          scores[i] += count * value;
        });
    });
    const items = baseItems.map((item, i) => ({ ...item, value: scores[i]! }));
    const lockedValue = scores.slice(pool.length).reduce((sum, v) => sum + v, 0);
    const pickNormal = target ? null : prepareKnapsack(items, maxRest, remaining);
    const pickStar = target ? prepareStarPicks(items, target) : null;
    for (const variant of config.variants) {
      for (const layout of layouts) {
        const { equipment, K } = layout;
        const free = equipment.localFree.length;
        for (
          let paid = Math.max(0, variant.local.length - free);
          paid <= equipment.localPaid.length;
          paid++
        ) {
          const budget = remaining - paid * CE_COST;
          if (budget < 0) break;
          const picked = pickStar ? pickStar(budget) : pickNormal!(K - locked.length, budget);
          if (!picked) continue;
          const extra5 = free + paid - variant.local.length;
          const value =
            picked.value +
            lockedValue +
            (K - capped) *
              (BASE_YIELD +
                BOND15_RATE * A +
                fixedGeneric +
                variant.generic +
                GENERIC_5_RATE * extra5);
          const cost = lockedCost + picked.cost + equipment.ceCost + paid * CE_COST;
          if (!best || value > best.value || (value === best.value && cost > best.cost))
            best = { value, cost, picked, layout, variant, extra5 };
        }
      }
    }
  }
  if (!best) throw new Error('auto-team: 无法满足锁定条件');
  const { picked, layout, variant, extra5 } = best;
  const packed = placeEquipment(
    layout.equipment,
    [...variant.local, ...Array.from<CeKind>({ length: extra5 }).fill(generic5)],
    variant.support,
  );
  let next = 0;
  const slots = input.slots.map((slot, slotIndex) => ({
    slotIndex,
    servant:
      slot.isSupport || !layout.occupied.includes(slotIndex)
        ? null
        : (lockedBySlot.get(slotIndex) ?? picked.servants[next++]!),
    ces: packed.placements[slotIndex]!,
  }));
  const team = slots.flatMap(s => (s.servant ? [s.servant] : []));
  const usedCost = team.reduce((sum, s) => sum + servantCost(s), 0) + packed.ceCost;
  const yieldSum = totalYield(team, packed.copies, A);
  if (
    usedCost > input.costCap ||
    usedCost !== best.cost ||
    yieldSum !== best.value ||
    team.length !== layout.K
  )
    throw new Error('auto-team: 求解结果校验失败');
  return { slots, usedCost, totalYield: yieldSum };
};
