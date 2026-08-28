import { beforeEach, describe, expect, test } from 'bun:test';
import { init, resetResources } from '../resources';
import { solve } from '../solve';
import { baseInput, catalog, fixtureResources, localSlot, supportSlot } from './fixtures';

const cheapTraits = [60, 61, 62, 63, 64].map(id => ({
  id,
  class: 'Assassin',
  star: 1,
  types: [0, 1, 2],
}));

const emptyStar5 = [50, 51, 52, 53, 54].map(id => ({
  id,
  class: 'Assassin',
  star: 5,
  types: [] as number[],
}));

beforeEach(() => {
  resetResources();
});

describe('solve', () => {
  test('未 init 时抛错', () => {
    expect(() => solve(baseInput())).toThrow();
  });

  test('§9.1：2 Caster + 1 Saber，两张付费礼装时收益 355', () => {
    const casters = [
      { id: 201, class: 'Caster', star: 5, types: [] as number[] },
      { id: 202, class: 'Caster', star: 5, types: [] as number[] },
    ];
    const saber = { id: 203, class: 'Saber', star: 5, types: [] as number[] };
    init(fixtureResources([...casters, saber]));
    const result = solve(
      baseInput({
        slots: [localSlot(), localSlot(), localSlot()],
        costCap: 48 + 32,
        servantIds: [201, 202, 203],
        ownedClassCes: ['Caster'],
        quotaClass: { Caster: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      }),
    );
    expect(result.totalYield).toBe(355);
  });

  test('默认模式比星级优先收益更高（低星吃特性礼装）', () => {
    init(fixtureResources([...cheapTraits, ...emptyStar5]));
    const shared = {
      slots: [localSlot(), localSlot(), localSlot(), localSlot(), localSlot()],
      costCap: 80,
      servantIds: [...cheapTraits, ...emptyStar5].map(s => s.id),
      ownedTraitCes: [0, 1, 2],
    };
    const normal = solve(baseInput({ ...shared, starPriority: false }));
    const starFirst = solve(baseInput({ ...shared, starPriority: true }));
    expect(normal.totalYield).toBeGreaterThan(starFirst.totalYield);
    expect(starFirst.slots.filter(s => s.servant?.star === 5)).toHaveLength(5);
    expect(starFirst.totalYield).toBe(500);
  });

  test('同收益时选更高 cost 的 ★5 而不是 ★4', () => {
    init(
      fixtureResources([
        { id: 51, class: 'Assassin', star: 4, types: [] },
        { id: 50, class: 'Assassin', star: 5, types: [] },
      ]),
    );
    const result = solve(
      baseInput({
        slots: [localSlot()],
        costCap: 16,
        servantIds: [50, 51],
      }),
    );
    expect(result.slots[0]!.servant?.star).toBe(5);
    expect(result.usedCost).toBe(16);
  });

  test('只筛 Rider 且有 Rider 礼装时结果不含通用虚拟从者', () => {
    init(fixtureResources([catalog.rider5, catalog.archer5]));
    const result = solve(
      baseInput({
        slots: [localSlot(), localSlot(), localSlot()],
        servantIds: [catalog.rider5.id],
        selectedClasses: ['Rider'],
        ownedClassCes: ['Rider'],
        costCap: 118,
      }),
    );
    expect(result.slots.some(s => s.servant?.kind === 'genericVirtual')).toBe(false);
  });

  test('筛 Rider+Archer 时可以用通用虚拟从者填空', () => {
    init(fixtureResources([catalog.rider5, catalog.archer5]));
    const result = solve(
      baseInput({
        slots: [localSlot(), localSlot(), localSlot()],
        servantIds: [catalog.rider5.id],
        selectedClasses: ['Rider', 'Archer'],
        ownedClassCes: ['Rider'],
        quotaClass: { Rider: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
        costCap: 118,
      }),
    );
    expect(result.slots.some(s => s.servant?.kind === 'genericVirtual')).toBe(true);
  });

  test('助战格从者为 null，且不计入人数基础收益', () => {
    init(fixtureResources([catalog.caster1]));
    const result = solve(
      baseInput({
        slots: [localSlot(), localSlot(), supportSlot()],
        servantIds: [catalog.caster1.id],
        ownedClassCes: ['Caster'],
        costCap: 118,
      }),
    );
    const support = result.slots.find((_, i) => i === 2);
    expect(support?.servant).toBeNull();
    expect(result.slots.filter(s => s.servant).length).toBeLessThanOrEqual(2);
    // 只有 1 名可上场真从者 + 职阶虚拟，助战不提供 100%
    expect(result.totalYield % 100 === 0 || result.totalYield > 100).toBe(true);
  });

  test('锁定从者即使不在库存名单也必须上场', () => {
    init(fixtureResources([catalog.rider5, catalog.caster1]));
    const result = solve(
      baseInput({
        slots: [{ ...localSlot(), lockedServantId: catalog.rider5.id }, localSlot()],
        servantIds: [catalog.caster1.id],
        costCap: 118,
      }),
    );
    expect(result.slots.some(s => s.servant?.id === catalog.rider5.id)).toBe(true);
  });

  test('空置本队格不能戴礼装', () => {
    init(fixtureResources([catalog.caster1]));
    const result = solve(
      baseInput({
        slots: [localSlot(true), localSlot()],
        servantIds: [catalog.caster1.id],
        ownedClassCes: ['Caster'],
        quotaClass: { Caster: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        quotaGeneric: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        costCap: 3,
      }),
    );
    const vacant = result.slots.filter(s => s.servant === null);
    expect(vacant.length).toBe(1);
    expect(vacant[0]!.ces.every(c => c === null) || vacant[0]!.ces.length === 0).toBe(true);
  });

  test('冠位助战不会戴两张 15%', () => {
    init(fixtureResources([catalog.caster1]));
    const result = solve(
      baseInput({
        slots: [localSlot(), supportSlot(true)],
        servantIds: [catalog.caster1.id],
        ownedClassCes: [],
        quotaClass: { Caster: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        quotaGeneric: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        costCap: 3,
      }),
    );
    const supportCes = result.slots[1]!.ces.filter(c => c?.kind === 'generic' && c.rate === 15);
    expect(supportCes.length).toBeLessThanOrEqual(1);
  });

  test('冠位第一张免费礼装会被填上', () => {
    init(fixtureResources([catalog.caster1]));
    const result = solve(
      baseInput({
        slots: [localSlot(true)],
        servantIds: [catalog.caster1.id],
        ownedClassCes: ['Caster'],
        costCap: 3,
      }),
    );
    expect(result.slots[0]!.ces[0]).not.toBeNull();
    expect(result.usedCost).toBe(3);
  });
});
