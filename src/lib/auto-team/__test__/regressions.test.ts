import { expect, test } from 'bun:test';
import { init } from '../resources';
import { solve } from '../solve';
import type { CatalogServant, PlannerInput } from '../types';
import { baseInput, fixtureResources, localSlot, supportSlot } from './fixtures';

const noVirtual = {
  quotaGeneric: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  quotaClass: Object.fromEntries(
    ['Caster', 'Rider', 'Saber'].map(c => [c, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }]),
  ),
};
const run = (servants: CatalogServant[], input: Partial<PlannerInput>) => {
  init(fixtureResources(servants));
  return solve(
    baseInput({ ...noVirtual, costCap: 56, servantIds: servants.map(s => s.id), ...input }),
  );
};
const fiveStars = [10, 20, 30].map(id => ({ id, class: 'Archer', star: 5, types: [] }));

test('助战可锁定目录中无人命中且本队未拥有的特性礼装', () => {
  const resources = { ...fixtureResources([]), traitCeTypes: [0, 7] };
  init(resources);
  for (const starPriority of [false, true]) {
    const result = solve(
      baseInput({
        ...noVirtual,
        starPriority,
        slots: [
          localSlot(),
          localSlot(),
          {
            ...supportSlot(true),
            lockedCes: [{ kind: 'trait', typeId: 7 }],
          },
        ],
      }),
    );
    expect(result.slots[2]!.ces[0]).toEqual({ kind: 'trait', typeId: 7 });
    expect(result.slots[2]!.ces.filter(Boolean)).toHaveLength(2);
    expect(result.totalYield).toBe(0);
    expect(result.usedCost).toBe(0);
  }
});

test('本队库存不能引入目录以外的特性礼装', () => {
  const resources = { ...fixtureResources([]), traitCeTypes: [0] };
  init(resources);
  expect(() => solve(baseInput({ ...noVirtual, ownedTraitCes: [7] }))).toThrow(Error);
});

test('真实从者只上场一次，恢复名单与收益一致', () => {
  const result = run(
    [
      { id: 10, class: 'Saber', star: 1, types: [] },
      { id: 20, class: 'Saber', star: 1, types: [0] },
    ],
    { slots: [localSlot(true), localSlot(), localSlot()], ownedTraitCes: [0] },
  );
  expect(result.slots.flatMap(s => (s.servant ? [s.servant.id] : [])).sort()).toEqual([10, 20]);
  expect(result.totalYield).toBe(240);
  expect(result.usedCost).toBe(38);
});

for (const starPriority of [false, true]) {
  test(`锁定付费礼装先占预算，星级优先=${starPriority}`, () => {
    const result = run(fiveStars, {
      starPriority,
      slots: [
        { ...localSlot(), lockedServantId: 10, lockedCes: [{ kind: 'generic', rate: 5 }] },
        { ...localSlot(), lockedServantId: 20 },
        localSlot(),
      ],
    });
    expect(result.usedCost).toBe(48);
    expect(result.totalYield).toBe(210);
    expect(result.slots[2]!.servant).toBeNull();
  });
}

test('可选付费礼装不能减少星级优先的五星人数', () => {
  const result = run(fiveStars, { starPriority: true });
  expect(result.slots.filter(s => s.servant?.star === 5)).toHaveLength(3);
  expect(result.totalYield).toBe(300);
  expect(result.usedCost).toBe(48);
});

test('助战可以使用本队未拥有的职阶礼装', () => {
  const servants = [10, 20].map(id => ({ id, class: 'Caster', star: 1, types: [] }));
  const result = run(servants, {
    slots: [...servants.map(s => ({ ...localSlot(), lockedServantId: s.id })), supportSlot()],
  });
  expect(result.totalYield).toBe(260);
  expect(result.slots[2]!.ces).toEqual([{ kind: 'class', className: 'Caster' }]);
});

test('5%按全队价值与特性礼装竞争', () => {
  const servants = Array.from({ length: 5 }, (_, i) => ({
    id: 10 + i,
    class: 'Archer',
    star: 1,
    types: i === 0 ? [0] : [],
  }));
  const result = run(servants, {
    slots: servants.map(s => ({ ...localSlot(), lockedServantId: s.id })),
    ownedTraitCes: [0],
  });
  expect(result.totalYield).toBe(550);
  expect(result.usedCost).toBe(47);
});

test('预算内带玛修时保留最高收益四星', () => {
  const result = run(
    [
      { id: 10, class: 'Archer', star: 5, types: [0] },
      { id: 20, class: 'Archer', star: 5, types: [0] },
      { id: 30, class: 'Archer', star: 4, types: [0] },
      { id: 40, class: 'Archer', star: 4, types: [] },
      { id: 1, class: 'Shielder', star: 4, types: [] },
    ],
    {
      costCap: 60,
      starPriority: true,
      ownedTraitCes: [0],
      slots: [
        { ...localSlot(), lockedServantId: 10 },
        { ...localSlot(), lockedServantId: 20 },
        localSlot(),
        localSlot(),
      ],
    },
  );
  expect(result.totalYield).toBe(460);
  expect(result.usedCost).toBe(60);
  expect(result.slots.some(s => s.servant?.id === 30)).toBe(true);
});

test('只锁冠位第二张时首张仍须填满，null本身不强制占位', () => {
  const result = run([fiveStars[0]!], {
    slots: [
      { ...localSlot(true), lockedCes: [null, { kind: 'generic', rate: 5 }] },
      { ...localSlot(), lockedCes: [null] },
      supportSlot(true),
    ],
  });
  expect(result.slots[0]!.servant?.id).toBe(10);
  expect(result.slots[0]!.ces).toEqual([
    { kind: 'generic', rate: 5 },
    { kind: 'generic', rate: 5 },
  ]);
  expect(result.slots[1]!.servant).toBeNull();
  expect(result.slots[2]!.ces.filter(Boolean)).toHaveLength(2);
});

test('全队满羁绊也填免费位并最大化可用付费cost', () => {
  const result = run([fiveStars[0]!], {
    slots: [
      { ...localSlot(true), lockedServantId: 10, bond15: true },
      localSlot(),
      supportSlot(true),
    ],
  });
  expect(result.totalYield).toBe(0);
  expect(result.usedCost).toBe(32);
  expect(result.slots[0]!.ces.filter(Boolean)).toHaveLength(2);
  expect(result.slots[2]!.ces.filter(Boolean)).toHaveLength(2);
});

test('空池无锁定允许空队但仍填助战免费位', () => {
  const result = run([], { slots: [localSlot(true), localSlot(), supportSlot(true)] });
  expect(result.totalYield).toBe(0);
  expect(result.usedCost).toBe(0);
  expect(result.slots[0]!.ces).toEqual([]);
  expect(result.slots[2]!.ces.filter(Boolean)).toHaveLength(2);
});

test('星级目标必须给仅锁礼装的必占格留出从者', () => {
  const servants = [...fiveStars, { id: 40, class: 'Archer', star: 1, types: [] }];
  const result = run(servants, {
    costCap: 56,
    starPriority: true,
    slots: Array.from({ length: 4 }, () => ({
      ...localSlot(true),
      lockedCes: [{ kind: 'generic' as const, rate: 5 as const }],
    })),
  });
  expect(result.slots.filter(s => s.servant)).toHaveLength(4);
  expect(result.slots.filter(s => s.servant?.star === 5)).toHaveLength(3);
});

test('无法满足锁定必须抛错，不能伪装空队', () => {
  expect(() =>
    run([], {
      slots: [
        { ...localSlot(), lockedCes: [{ kind: 'generic', rate: 5 }] },
        localSlot(),
        localSlot(),
      ],
    }),
  ).toThrow();
  expect(() =>
    run(fiveStars, {
      slots: [
        { ...localSlot(), lockedServantId: 10 },
        { ...localSlot(), lockedServantId: 10 },
        localSlot(),
      ],
    }),
  ).toThrow();
  expect(() =>
    run(fiveStars, {
      slots: fiveStars.map(s => ({
        ...localSlot(),
        lockedServantId: s.id,
        lockedCes: [{ kind: 'generic', rate: 5 }],
      })),
    }),
  ).toThrow();
});

test('拒绝重复库存、未拥有及超出位置容量的锁定礼装', () => {
  expect(() =>
    run(fiveStars, {
      slots: [
        localSlot(),
        localSlot(),
        { ...localSlot(), lockedCes: [{ kind: 'generic', rate: 15 }] },
      ],
    }),
  ).toThrow();
  expect(() =>
    run(fiveStars, {
      ownedGeneric10: true,
      slots: [0, 1, 2].map(() => ({ ...localSlot(), lockedCes: [{ kind: 'generic', rate: 10 }] })),
    }),
  ).toThrow();
  expect(() =>
    run(fiveStars, {
      slots: [
        { ...localSlot(), lockedCes: [{ kind: 'trait', typeId: 0 }] },
        localSlot(),
        localSlot(),
      ],
    }),
  ).toThrow();
  expect(() =>
    run(fiveStars, {
      slots: [
        {
          ...localSlot(),
          lockedCes: [
            { kind: 'generic', rate: 5 },
            { kind: 'generic', rate: 5 },
          ],
        },
        localSlot(),
        localSlot(),
      ],
    }),
  ).toThrow();
});
