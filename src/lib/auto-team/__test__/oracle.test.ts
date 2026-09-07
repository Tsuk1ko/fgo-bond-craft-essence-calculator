import { describe, expect, test } from 'bun:test';
import { init } from '../resources';
import { solve } from '../solve';
import type {
  CatalogServant,
  CeKind,
  PlannerInput,
  PlannerResources,
  PlannerResult,
  PlannerServant,
} from '../types';
import { baseInput, localSlot, supportSlot } from './fixtures';

const zeroQuota = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const starCost = [4, 3, 4, 7, 12, 16];
const ceKey = (ce: CeKind) => JSON.stringify(ce);
const servantKey = (s: PlannerServant) =>
  s.kind === 'real' ? `real:${s.id}` : `${s.kind}:${s.class}:${s.star}`;
const costOf = (s: PlannerServant, resources: PlannerResources) =>
  s.kind === 'real' && s.id === resources.mashId ? 0 : starCost[s.star]!;
const asReal = (s: CatalogServant, canGainBond = true): PlannerServant => ({
  id: s.id,
  kind: 'real',
  class: s.class,
  star: s.star,
  types: [...new Set([...s.types, ...Object.keys(s.typeComments ?? {}).map(Number)])],
  canGainBond,
});

// 测试模型直接展开有限库存，不调用生产池构造、礼装打包或收益函数。
const inventory = (resources: PlannerResources, input: PlannerInput): PlannerServant[] => {
  const locked = new Set(input.slots.filter(s => !s.isSupport).map(s => s.lockedServantId));
  const range = input.selectedClasses.length ? input.selectedClasses : resources.classList;
  const pool = resources.servants
    .filter(s => input.servantIds.includes(s.id) && !input.hiddenIds.includes(s.id))
    .filter(s => range.includes(s.class))
    .filter(s => !input.selectedStars.length || input.selectedStars.includes(s.star))
    .filter(s => !locked.has(s.id))
    .map(s => asReal(s));
  const virtualClasses: Array<string | null> = resources.classCeClasses.filter(
    c => range.includes(c) && input.ownedClassCes.includes(c),
  );
  if (range.some(c => !resources.classCeClasses.includes(c))) virtualClasses.push(null);
  for (const className of virtualClasses) {
    for (let star = 1; star <= 5; star++) {
      if (input.selectedStars.length && !input.selectedStars.includes(star)) continue;
      const quota =
        (className === null ? input.quotaGeneric?.[star] : input.quotaClass?.[className]?.[star]) ??
        6;
      for (let copy = 0; copy < Math.min(quota, input.slots.length); copy++) {
        pool.push({
          id: -1,
          kind: className === null ? 'genericVirtual' : 'classVirtual',
          class: className,
          star,
          types: [],
          canGainBond: true,
        });
      }
    }
  }
  return pool;
};

const ceInventory = (
  resources: PlannerResources,
  input: PlannerInput,
  support: boolean,
): CeKind[] => {
  const traits = support ? resources.traitCeTypes : input.ownedTraitCes;
  const ces: CeKind[] = [
    ...traits.map((typeId): CeKind => ({ kind: 'trait', typeId })),
    ...(support ? resources.classCeClasses : input.ownedClassCes).map((className): CeKind => ({
      kind: 'class',
      className,
    })),
    { kind: 'generic', rate: 5 },
  ];
  if (support || input.ownedGeneric10) ces.push({ kind: 'generic', rate: 10 });
  if (support) ces.push({ kind: 'generic', rate: 15 });
  return ces;
};

const measure = (
  resources: PlannerResources,
  input: PlannerInput,
  team: Array<PlannerServant | null>,
  equipment: Array<Array<CeKind | null>>,
): number[] => {
  const members = team.filter((s): s is PlannerServant => s !== null);
  const auraCount = input.slots.filter(s => s.lockedServantId !== undefined && s.bond15).length;
  const ces = equipment.flat().filter((ce): ce is CeKind => ce !== null);
  let gain = 0;
  for (const servant of members) {
    if (!servant.canGainBond) continue;
    gain += 100 + 25 * auraCount;
    for (const ce of ces) {
      if (ce.kind === 'generic') gain += ce.rate;
      else if (ce.kind === 'trait' && servant.types.includes(ce.typeId)) gain += 20;
      else if (ce.kind === 'class' && servant.class === ce.className) gain += 20;
    }
  }
  let cost = members.reduce((sum, s) => sum + costOf(s, resources), 0);
  equipment.forEach((row, i) => {
    row.forEach((ce, pos) => {
      if (ce && !input.slots[i]!.isSupport && !(input.slots[i]!.isCrown && pos === 0)) cost += 16;
    });
  });
  const stars = input.starPriority
    ? [5, 4, 3, 2, 1, 0].map(star => members.filter(s => s.star === star).length)
    : [];
  return [...stars, gain, cost];
};

const greater = (a: number[], b: number[]) => {
  const index = a.findIndex((value, i) => value !== b[i]);
  return index !== -1 && a[index]! > b[index]!;
};

const exhaustive = (resources: PlannerResources, input: PlannerInput): number[] => {
  const pool = inventory(resources, input);
  const localCes = ceInventory(resources, input, false);
  const supportCes = ceInventory(resources, input, true);
  const team: Array<PlannerServant | null> = input.slots.map(() => null);
  const equipment: Array<Array<CeKind | null>> = input.slots.map(() => []);
  const picked = new Set<number>();
  let best = Array.from<number>({ length: input.starPriority ? 8 : 2 }).fill(-1);

  const equip = (
    slotIndex: number,
    pos: number,
    spent: number,
    local: Set<string>,
    support: Set<string>,
  ) => {
    if (spent > input.costCap) return;
    if (slotIndex === input.slots.length) {
      const value = measure(resources, input, team, equipment);
      if (greater(value, best)) best = value;
      return;
    }
    const slot = input.slots[slotIndex]!;
    if (!slot.isSupport && !team[slotIndex]) {
      if (slot.lockedCes?.some(Boolean)) return;
      equipment[slotIndex] = [];
      equip(slotIndex + 1, 0, spent, local, support);
      return;
    }
    if (pos === (slot.isCrown ? 2 : 1)) {
      equip(slotIndex + 1, 0, spent, local, support);
      return;
    }
    const free = slot.isSupport || (slot.isCrown && pos === 0);
    const locked = slot.lockedCes?.[pos];
    const options: Array<CeKind | null> = locked
      ? [locked]
      : [...(slot.isSupport ? supportCes : localCes), ...(free ? [] : [null])];
    const used = slot.isSupport ? support : local;
    for (const ce of options) {
      const finite = ce && !(ce.kind === 'generic' && ce.rate === 5);
      const key = ce ? ceKey(ce) : '';
      if (finite && used.has(key)) continue;
      equipment[slotIndex]![pos] = ce;
      if (finite) used.add(key);
      equip(slotIndex, pos + 1, spent + (ce && !free ? 16 : 0), local, support);
      if (finite) used.delete(key);
    }
  };

  const assign = (i: number, spent: number) => {
    if (spent > input.costCap) return;
    if (i === input.slots.length) {
      equip(0, 0, spent, new Set(), new Set());
      return;
    }
    const slot = input.slots[i]!;
    if (slot.isSupport) return assign(i + 1, spent);
    if (slot.lockedServantId !== undefined) {
      const servant = resources.servants.find(s => s.id === slot.lockedServantId)!;
      team[i] = asReal(servant, !slot.bond15 || !!slot.bondCap16);
      assign(i + 1, spent + costOf(team[i]!, resources));
      return;
    }
    team[i] = null;
    assign(i + 1, spent);
    for (let j = 0; j < pool.length; j++) {
      if (picked.has(j)) continue;
      picked.add(j);
      team[i] = pool[j]!;
      assign(i + 1, spent + costOf(pool[j]!, resources));
      picked.delete(j);
    }
  };
  assign(0, 0);
  return best;
};

const validate = (resources: PlannerResources, input: PlannerInput, result: PlannerResult) => {
  expect(result.slots).toHaveLength(input.slots.length);
  const available = inventory(resources, input).map(servantKey);
  const usedCes = [new Set<string>(), new Set<string>()];
  const realIds = new Set<number>();
  result.slots.forEach((actual, i) => {
    const slot = input.slots[i]!;
    expect(actual.slotIndex).toBe(i);
    if (slot.isSupport) expect(actual.servant).toBeNull();
    else if (actual.servant) {
      const s = actual.servant;
      if (slot.lockedServantId !== undefined) expect(s.id).toBe(slot.lockedServantId);
      else {
        const index = available.indexOf(servantKey(s));
        expect(index).toBeGreaterThanOrEqual(0);
        available.splice(index, 1);
      }
      if (s.kind === 'real') {
        expect(realIds.has(s.id)).toBe(false);
        realIds.add(s.id);
        const original = resources.servants.find(c => c.id === s.id)!;
        const expected = asReal(original, !slot.bond15 || !!slot.bondCap16);
        expect({ ...s, types: [...s.types].sort() }).toEqual({
          ...expected,
          types: expected.types.sort(),
        });
      } else {
        expect(s.types).toEqual([]);
        expect(s.canGainBond).toBe(true);
      }
    } else expect(slot.lockedServantId).toBeUndefined();
    if (!slot.isSupport && !actual.servant) {
      expect(actual.ces.every(ce => ce === null)).toBe(true);
      expect(slot.lockedCes?.some(Boolean) ?? false).toBe(false);
      return;
    }
    expect(actual.ces).toHaveLength(slot.isCrown ? 2 : 1);
    const permitted = ceInventory(resources, input, slot.isSupport).map(ceKey);
    actual.ces.forEach((ce, pos) => {
      if (slot.lockedCes?.[pos]) expect(ce).toEqual(slot.lockedCes[pos]);
      if (slot.isSupport || (slot.isCrown && pos === 0)) expect(ce).not.toBeNull();
      if (!ce) return;
      expect(permitted).toContain(ceKey(ce));
      if (ce.kind === 'generic' && ce.rate === 5) return;
      const used = usedCes[slot.isSupport ? 1 : 0]!;
      expect(used.has(ceKey(ce))).toBe(false);
      used.add(ceKey(ce));
    });
  });
  const value = measure(
    resources,
    input,
    result.slots.map(s => s.servant),
    result.slots.map(s => s.ces),
  );
  expect(result.totalYield).toBe(value.at(-2)!);
  expect(result.usedCost).toBe(value.at(-1)!);
  expect(result.usedCost).toBeLessThanOrEqual(input.costCap);
  return value;
};

describe('solve 独立小池穷举', () => {
  let seed = 0x5eed2026;
  const random = (n: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor((seed / 0x100000000) * n);
  };
  for (let caseIndex = 0; caseIndex < 32; caseIndex++) {
    const servants: CatalogServant[] = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      class: ['Caster', 'Archer'][random(2)]!,
      star: random(6),
      types: random(3) ? [random(2)] : [],
      ...(i === 1 ? { typeComments: { 1: '灵衣' } } : {}),
    }));
    const resources: PlannerResources = {
      servants,
      traitCeTypes: [0, 1],
      classCeClasses: ['Caster'],
      classList: ['Caster', 'Archer'],
      mashId: 1,
    };
    const slots = [
      localSlot(caseIndex % 3 === 0),
      localSlot(),
      caseIndex % 2 ? supportSlot(caseIndex % 3 === 1) : localSlot(),
    ];
    if (caseIndex % 4 === 0) {
      slots[0] = { ...slots[0]!, lockedServantId: 1, bond15: true, bondCap16: caseIndex % 8 === 0 };
    }
    if (caseIndex % 5 === 0) slots[1] = { ...slots[1]!, lockedCes: [{ kind: 'generic', rate: 5 }] };
    if (caseIndex % 7 === 0 && slots[2]!.isSupport) {
      slots[2] = {
        ...slots[2]!,
        lockedServantId: 2,
        bond15: true,
        lockedCes: [{ kind: 'generic', rate: 15 }],
      };
    }
    const input = baseInput({
      slots,
      costCap: 20 + random(53),
      servantIds: servants.map(s => s.id),
      hiddenIds: caseIndex % 6 === 0 ? [1] : [],
      selectedClasses: caseIndex % 9 === 0 ? ['Caster'] : [],
      ownedTraitCes: caseIndex % 3 === 0 ? [0, 1] : caseIndex % 3 === 1 ? [0] : [],
      ownedClassCes: caseIndex % 2 === 0 ? ['Caster'] : [],
      ownedGeneric10: caseIndex % 4 < 2,
      quotaClass: { Caster: { ...zeroQuota, 1: caseIndex % 5 === 0 ? 1 : 0 } },
      quotaGeneric: { ...zeroQuota, 2: caseIndex % 7 === 0 ? 1 : 0 },
    });
    for (const starPriority of [false, true]) {
      test(`固定种子样例 ${caseIndex}，星级优先 ${starPriority}`, () => {
        const scenario = { ...input, starPriority };
        init(resources);
        const expected = exhaustive(resources, scenario);
        if (expected.at(-1) === -1) {
          expect(() => solve(scenario)).toThrow();
        } else {
          expect(validate(resources, scenario, solve(scenario))).toEqual(expected);
        }
      });
    }
  }

  for (const quota of [0, 1]) {
    test(`零 cost 玛修与通用虚拟有限份数 ${quota}`, () => {
      const resources: PlannerResources = {
        servants: [{ id: 1, class: 'Archer', star: 4, types: [0] }],
        traitCeTypes: [0],
        classCeClasses: [],
        classList: ['Archer'],
        mashId: 1,
      };
      const input = baseInput({
        slots: [localSlot(true), localSlot(), supportSlot(true)],
        servantIds: [1],
        ownedTraitCes: [0],
        costCap: quota * 3,
        quotaGeneric: { ...zeroQuota, 1: quota },
      });
      init(resources);
      expect(validate(resources, input, solve(input))).toEqual(exhaustive(resources, input));
    });
  }

  test('锁定付费礼装预算迫使星级向量减少一名五星', () => {
    const resources: PlannerResources = {
      servants: [2, 3, 4].map(id => ({ id, class: 'Caster', star: 5, types: [0] })),
      traitCeTypes: [0],
      classCeClasses: ['Caster'],
      classList: ['Caster'],
      mashId: 1,
    };
    const input = baseInput({
      slots: [
        localSlot(true),
        { ...localSlot(), lockedCes: [{ kind: 'generic', rate: 5 }] },
        localSlot(),
      ],
      servantIds: [2, 3, 4],
      costCap: 48,
      starPriority: true,
      quotaGeneric: zeroQuota,
    });
    init(resources);
    const expected = exhaustive(resources, input);
    expect(expected[0]).toBe(2);
    expect(validate(resources, input, solve(input))).toEqual(expected);
  });

  test('第二张锁定的冠位以 null 表示首张未锁，全队零收益仍填免费位', () => {
    const resources: PlannerResources = {
      servants: [{ id: 1, class: 'Caster', star: 4, types: [0] }],
      traitCeTypes: [0],
      classCeClasses: ['Caster'],
      classList: ['Caster'],
      mashId: 1,
    };
    const input = baseInput({
      slots: [
        {
          ...localSlot(true),
          lockedServantId: 1,
          bond15: true,
          lockedCes: [null, { kind: 'generic', rate: 5 }],
        },
        localSlot(),
        supportSlot(true),
      ],
      costCap: 16,
      quotaGeneric: zeroQuota,
    });
    init(resources);
    const expected = exhaustive(resources, input);
    expect(expected).toEqual([0, 16]);
    expect(validate(resources, input, solve(input))).toEqual(expected);
  });
});
