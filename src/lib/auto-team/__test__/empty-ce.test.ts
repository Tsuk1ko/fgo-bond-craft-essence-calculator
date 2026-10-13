import { expect, test } from 'bun:test';
import { init } from '../resources';
import { solve } from '../solve';
import { baseInput, fixtureResources, localSlot, supportSlot } from './fixtures';

const noVirtual = {
  quotaGeneric: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  quotaClass: {},
};

for (const starPriority of [false, true]) {
  test(`空置不自动填礼装，冠位另一张和助战保持独立，星级优先=${starPriority}`, () => {
    init(fixtureResources([{ id: 10, class: 'Archer', star: 5, types: [] }]));
    const result = solve(
      baseInput({
        ...noVirtual,
        starPriority,
        servantIds: [10],
        slots: [
          { ...localSlot(true), lockedServantId: 10, lockedCes: ['empty', null] },
          { ...supportSlot(true), lockedCes: ['empty', { kind: 'generic', rate: 15 }] },
        ],
      }),
    );
    expect(result.slots[0]!.ces).toEqual([null, { kind: 'generic', rate: 5 }]);
    expect(result.slots[1]!.ces).toEqual([null, { kind: 'generic', rate: 15 }]);
    expect(result.usedCost).toBe(32);
    expect(result.totalYield).toBe(120);
  });

  test(`部分上场优先保留可用的礼装位，星级优先=${starPriority}`, () => {
    init(fixtureResources([{ id: 10, class: 'Archer', star: 5, types: [] }]));
    const result = solve(
      baseInput({
        ...noVirtual,
        starPriority,
        servantIds: [10],
        slots: [
          { ...localSlot(true), lockedCes: ['empty', 'empty'] },
          localSlot(),
          { ...localSlot(true), lockedCes: [null, 'empty'] },
        ],
      }),
    );
    expect(result.slots[0]!.servant).toBeNull();
    // 同收益优先已用 cost：普通格可付费戴 5%，优于只有免费位的格。
    expect(result.slots[1]!.servant?.id).toBe(10);
    expect(result.usedCost).toBe(32);
    expect(result.totalYield).toBe(105);
  });
}

test('空池时空置锁定不强制本队上场，助战也可空置', () => {
  init(fixtureResources([]));
  const result = solve(
    baseInput({
      ...noVirtual,
      slots: [
        { ...localSlot(), lockedCes: ['empty'] },
        { ...supportSlot(), lockedCes: ['empty'] },
      ],
    }),
  );
  expect(result.slots.map(s => s.servant)).toEqual([null, null]);
  expect(result.slots[1]!.ces).toEqual([null]);
  expect(result.usedCost).toBe(0);
  expect(result.totalYield).toBe(0);
});
