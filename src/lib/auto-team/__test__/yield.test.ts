import { describe, expect, test } from 'bun:test';
import type { AuraCopies, PlannerServant } from '../types';
import { servantYield, totalYield } from '../yield';

const servant = (
  partial: Pick<PlannerServant, 'class' | 'types'> & Partial<PlannerServant>,
): PlannerServant => ({
  id: partial.id ?? 1,
  kind: 'real',
  star: 5,
  canGainBond: true,
  ...partial,
});

const copies = (overrides: Partial<AuraCopies> = {}): AuraCopies => ({
  trait: {},
  class: {},
  generic5: 0,
  generic10: 0,
  generic15: 0,
  ...overrides,
});

describe('羁绊收益', () => {
  test('2 Caster + 1 Saber，1 张职阶礼装 + 1 张 5% → 355', () => {
    const team = [
      servant({ id: 1, class: 'Caster', types: [] }),
      servant({ id: 2, class: 'Caster', types: [] }),
      servant({ id: 3, class: 'Saber', types: [] }),
    ];
    const aura = copies({ class: { Caster: 1 }, generic5: 1 });
    expect(totalYield(team, aura, 0)).toBe(355);
  });

  test('助战再叠一张 Caster 礼装 → 395', () => {
    const team = [
      servant({ id: 1, class: 'Caster', types: [] }),
      servant({ id: 2, class: 'Caster', types: [] }),
      servant({ id: 3, class: 'Saber', types: [] }),
    ];
    const aura = copies({ class: { Caster: 2 }, generic5: 1 });
    expect(totalYield(team, aura, 0)).toBe(395);
  });

  test('不可获羁绊的从者自身为 0，但仍计入 A 给队友 +25', () => {
    const capped = servant({ id: 1, class: 'Assassin', types: [], canGainBond: false });
    const mate = servant({ id: 2, class: 'Assassin', types: [] });
    expect(servantYield(capped, copies(), 1)).toBe(0);
    expect(servantYield(mate, copies(), 1)).toBe(125);
    expect(totalYield([capped, mate], copies(), 1)).toBe(125);
  });

  test('特性礼装只加给 types 命中的从者', () => {
    const hit = servant({ id: 1, class: 'Assassin', types: [0] });
    const miss = servant({ id: 2, class: 'Assassin', types: [1] });
    const aura = copies({ trait: { 0: 1 } });
    expect(servantYield(hit, aura, 0)).toBe(120);
    expect(servantYield(miss, aura, 0)).toBe(100);
  });
});
