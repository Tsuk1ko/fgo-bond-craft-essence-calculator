import { beforeEach, describe, expect, test } from 'bun:test';
import { buildVirtualPool } from '../pool';
import { init, resetResources } from '../resources';
import type { PlannerServant } from '../types';
import { baseInput, catalog, fixtureResources } from './fixtures';

const ALL = [catalog.rider5, catalog.archer5, catalog.caster3, catalog.saber1];

const classVirtuals = (pool: PlannerServant[]) => pool.filter(s => s.kind === 'classVirtual');
const genericVirtuals = (pool: PlannerServant[]) => pool.filter(s => s.kind === 'genericVirtual');
const reals = (pool: PlannerServant[]) => pool.filter(s => s.kind === 'real');

beforeEach(() => {
  resetResources();
  init(fixtureResources(ALL));
});

describe('buildVirtualPool', () => {
  test('不筛职阶且三职阶礼装都有：C/R/S 职阶虚拟与通用虚拟都进', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        ownedClassCes: ['Caster', 'Rider', 'Saber'],
      }),
    );
    const classes = new Set(classVirtuals(pool).map(s => s.class));
    expect(classes.has('Caster')).toBe(true);
    expect(classes.has('Rider')).toBe(true);
    expect(classes.has('Saber')).toBe(true);
    expect(genericVirtuals(pool).length).toBeGreaterThan(0);
  });

  test('只筛 Rider 且有 Rider 礼装：Rider 职阶虚拟进，通用虚拟不进', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        selectedClasses: ['Rider'],
        ownedClassCes: ['Rider'],
      }),
    );
    expect(classVirtuals(pool).every(s => s.class === 'Rider')).toBe(true);
    expect(classVirtuals(pool).length).toBeGreaterThan(0);
    expect(genericVirtuals(pool)).toEqual([]);
  });

  test('筛 Rider+Archer 且有 Rider 礼装：Rider 职阶虚拟与通用虚拟都进', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        selectedClasses: ['Rider', 'Archer'],
        ownedClassCes: ['Rider'],
      }),
    );
    expect(classVirtuals(pool).some(s => s.class === 'Rider')).toBe(true);
    expect(classVirtuals(pool).some(s => s.class === 'Caster')).toBe(false);
    expect(genericVirtuals(pool).length).toBeGreaterThan(0);
  });

  test('只筛 Archer：无职阶虚拟，通用虚拟进', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        selectedClasses: ['Archer'],
        ownedClassCes: ['Rider'],
      }),
    );
    expect(classVirtuals(pool)).toEqual([]);
    expect(genericVirtuals(pool).length).toBeGreaterThan(0);
  });

  test('只筛 Caster 且无 Caster 礼装：两种虚拟都不进', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        selectedClasses: ['Caster'],
        ownedClassCes: ['Rider'],
      }),
    );
    expect(classVirtuals(pool)).toEqual([]);
    expect(genericVirtuals(pool)).toEqual([]);
  });

  test('只筛 Caster+Rider+Saber 且三张礼装都有：职阶虚拟进，通用虚拟不进', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        selectedClasses: ['Caster', 'Rider', 'Saber'],
        ownedClassCes: ['Caster', 'Rider', 'Saber'],
      }),
    );
    expect(classVirtuals(pool).length).toBeGreaterThan(0);
    expect(genericVirtuals(pool)).toEqual([]);
  });

  test('servantIds 未包含的真从者不进池', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: [catalog.rider5.id],
        ownedClassCes: [],
      }),
    );
    expect(reals(pool).map(s => s.id)).toEqual([catalog.rider5.id]);
  });

  test('隐藏的真从者不进池', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: [catalog.rider5.id],
        hiddenIds: [catalog.rider5.id],
        ownedClassCes: [],
      }),
    );
    expect(reals(pool)).toEqual([]);
  });

  test('星级筛选挡住虚拟 ★1', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        selectedStars: [5],
        ownedClassCes: ['Rider'],
        selectedClasses: ['Rider', 'Archer'],
      }),
    );
    expect(classVirtuals(pool).every(s => s.star === 5)).toBe(true);
    expect(genericVirtuals(pool).every(s => s.star === 5)).toBe(true);
  });

  test('typeComments 中的特性仍视为具备', () => {
    resetResources();
    init(
      fixtureResources([
        { id: 70, class: 'Lancer', star: 5, types: [3], typeComments: { 0: '灵衣' } },
      ]),
    );
    const pool = buildVirtualPool(baseInput({ servantIds: [70], ownedClassCes: [] }));
    expect(pool.find(s => s.id === 70)?.types.includes(0)).toBe(true);
    expect(pool.find(s => s.id === 70)?.types.includes(3)).toBe(true);
  });

  test('配额为 0 的星级不生成虚拟从者', () => {
    const pool = buildVirtualPool(
      baseInput({
        servantIds: ALL.map(s => s.id),
        selectedClasses: ['Rider', 'Archer'],
        ownedClassCes: ['Rider'],
        quotaClass: { Rider: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        quotaGeneric: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }),
    );
    expect(classVirtuals(pool)).toEqual([]);
    expect(genericVirtuals(pool)).toEqual([]);
  });
});
