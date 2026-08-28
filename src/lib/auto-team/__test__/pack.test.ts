import { describe, expect, test } from 'bun:test';
import { occupyLocalSlotIndices } from '../occupy';
import { packCraftEssences } from '../pack';
import type { PlannerServant } from '../types';
import { localSlot, supportSlot } from './fixtures';

const caster = (id: number): PlannerServant => ({
  id,
  kind: 'real',
  class: 'Caster',
  star: 5,
  types: [],
  canGainBond: true,
});

const saber = (id: number): PlannerServant => ({
  id,
  kind: 'real',
  class: 'Saber',
  star: 5,
  types: [],
  canGainBond: true,
});

describe('occupyLocalSlotIndices', () => {
  test('未锁定时优先占冠位本队格', () => {
    const slots = [localSlot(false), localSlot(true), localSlot(false)];
    expect(occupyLocalSlotIndices(slots, 1)).toEqual([1]);
    expect(occupyLocalSlotIndices(slots, 2)).toEqual([1, 0]);
  });

  test('锁定格必须占用，其余仍优先冠位', () => {
    const locked = { ...localSlot(false), lockedServantId: 99 };
    const slots = [localSlot(true), localSlot(false), locked];
    expect(occupyLocalSlotIndices(slots, 2)).toEqual([2, 0]);
  });

  test('只锁定礼装的本队格也视为已占用', () => {
    const ceLocked = {
      ...localSlot(false),
      lockedCes: [{ kind: 'generic' as const, rate: 5 as const }],
    };
    const slots = [localSlot(true), ceLocked];
    expect(occupyLocalSlotIndices(slots, 1)).toEqual([1]);
  });
});

describe('packCraftEssences', () => {
  test('无助战无冠位时付费礼装各 16，剩余 cost 不够则留空', () => {
    const slots = [localSlot(), localSlot(), localSlot()];
    const team = [caster(1), caster(2), saber(3)];
    const packed = packCraftEssences({
      slots,
      occupiedLocalIndices: [0, 1, 2],
      servantCostSum: 48,
      costCap: 48 + 16,
      ownedTraitCes: [],
      ownedClassCes: ['Caster'],
      ownedGeneric10: false,
      team,
    });
    expect(packed.ceCost).toBe(16);
    expect(packed.copies.class.Caster).toBe(1);
    const filled = packed.placements.flat().filter(Boolean);
    expect(filled).toHaveLength(1);
  });

  test('助战礼装不计 cost，且可与本队重复职阶礼装', () => {
    const slots = [localSlot(), localSlot(), supportSlot()];
    const team = [caster(1), caster(2)];
    const packed = packCraftEssences({
      slots,
      occupiedLocalIndices: [0, 1],
      servantCostSum: 32,
      costCap: 32,
      ownedTraitCes: [],
      ownedClassCes: ['Caster'],
      ownedGeneric10: false,
      team,
    });
    expect(packed.ceCost).toBe(0);
    expect(packed.copies.class.Caster).toBeGreaterThanOrEqual(1);
    expect(packed.placements[2]!.some(c => c?.kind === 'class' && c.className === 'Caster')).toBe(
      true,
    );
  });

  test('冠位第一张免费，必须填上高价值光环', () => {
    const slots = [localSlot(true)];
    const team = [caster(1)];
    const packed = packCraftEssences({
      slots,
      occupiedLocalIndices: [0],
      servantCostSum: 16,
      costCap: 16,
      ownedTraitCes: [],
      ownedClassCes: ['Caster'],
      ownedGeneric10: false,
      team,
    });
    expect(packed.ceCost).toBe(0);
    expect(packed.placements[0]![0]).toEqual({ kind: 'class', className: 'Caster' });
  });

  test('锁定礼装钉在该位', () => {
    const slots = [
      {
        ...localSlot(),
        lockedCes: [{ kind: 'trait' as const, typeId: 0 }],
      },
    ];
    const team = [caster(1)];
    const packed = packCraftEssences({
      slots,
      occupiedLocalIndices: [0],
      servantCostSum: 16,
      costCap: 32,
      ownedTraitCes: [0],
      ownedClassCes: ['Caster'],
      ownedGeneric10: false,
      team,
    });
    expect(packed.placements[0]![0]).toEqual({ kind: 'trait', typeId: 0 });
  });

  test('本队冠位免费位在没有更高价值礼装时用 5% 填满', () => {
    const slots = [localSlot(true)];
    const packed = packCraftEssences({
      slots,
      occupiedLocalIndices: [0],
      servantCostSum: 16,
      costCap: 16,
      ownedTraitCes: [],
      ownedClassCes: [],
      ownedGeneric10: false,
      team: [caster(1)],
    });
    expect(packed.placements[0]![0]).toEqual({ kind: 'generic', rate: 5 });
    expect(packed.ceCost).toBe(0);
    expect(packed.copies.generic5).toBe(1);
  });
});
