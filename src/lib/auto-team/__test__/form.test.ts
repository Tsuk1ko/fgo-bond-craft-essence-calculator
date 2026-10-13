import { expect, test } from 'bun:test';
import {
  createPlannerInput,
  lockCe,
  lockServant,
  reconcileCeLocks,
  resizeSlots,
  setCrown,
  setSupport,
} from '../form';
import { fixtureResources } from './fixtures';

const create = () =>
  createPlannerInput(
    fixtureResources([
      { id: 10, class: 'Caster', star: 5, types: [0] },
      { id: -99, class: 'Caster', star: -1, types: [] },
    ]),
  );

test('页面输入仅含真从者，配额各行互不影响', () => {
  const input = create();
  expect(input.servantIds).toEqual([10]);
  input.quotaClass!.Caster![1] = 0;
  expect(input.quotaClass!.Rider![1]).toBe(6);
  expect(input.quotaGeneric![1]).toBe(6);
});

test('同一真从者不能重复锁定，解除锁定同时清除羁绊状态', () => {
  const input = create();
  expect(lockServant(input, 0, 10)).toBeUndefined();
  expect(lockServant(input, 1, 10)).toBe(0);
  expect(input.slots[1]!.lockedServantId).toBeUndefined();
  input.slots[0]!.bond15 = true;
  input.slots[0]!.bondCap16 = true;
  lockServant(input, 0, undefined);
  expect(input.slots[0]!.bond15).toBe(false);
  expect(input.slots[0]!.bondCap16).toBe(false);
});

test('有限礼装按本队与助战分别占库存，同格第二张也检查重复', () => {
  const input = create();
  input.ownedGeneric10 = true;
  const ce = { kind: 'generic', rate: 10 } as const;
  expect(lockCe(input, 0, 0, ce)).toBeUndefined();
  expect(lockCe(input, 1, 0, ce)).toBe(0);
  setSupport(input, 2, true);
  expect(lockCe(input, 2, 0, ce)).toBeUndefined();
  setCrown(input.slots[2]!, true);
  expect(lockCe(input, 2, 1, ce)).toBe(2);
  expect(lockCe(input, 1, 0, 'empty')).toBeUndefined();
});

test('移除库存只解除本队对应锁定，助战保持完整目录', () => {
  const input = create();
  input.ownedClassCes = ['Caster'];
  lockCe(input, 0, 0, { kind: 'class', className: 'Caster' });
  setSupport(input, 1, true);
  lockCe(input, 1, 0, { kind: 'class', className: 'Caster' });
  input.ownedClassCes = [];
  expect(reconcileCeLocks(input)).toBe(1);
  expect(input.slots[0]!.lockedCes?.[0]).toBeNull();
  expect(input.slots[1]!.lockedCes?.[0]).toEqual({ kind: 'class', className: 'Caster' });
});

test('切换助战保持至多一格，清除从者状态与原助战不合法礼装', () => {
  const input = create();
  setSupport(input, 0, true);
  lockCe(input, 0, 0, { kind: 'generic', rate: 15 });
  lockServant(input, 1, 10);
  input.slots[1]!.bond15 = true;
  setSupport(input, 1, true);
  expect(input.slots.filter(s => s.isSupport)).toHaveLength(1);
  expect(input.slots[0]!.lockedCes?.[0]).toBeNull();
  expect(input.slots[1]!.lockedServantId).toBeUndefined();
  expect(input.slots[1]!.bond15).toBe(false);
});

test('关闭冠位仅清理第二礼装，缩减再扩容不恢复已删除锁定', () => {
  const input = create();
  setCrown(input.slots[5]!, true);
  lockCe(input, 5, 0, 'empty');
  lockCe(input, 5, 1, { kind: 'generic', rate: 5 });
  expect(setCrown(input.slots[5]!, false)).toBe(true);
  expect(input.slots[5]!.lockedCes).toEqual(['empty']);
  expect(resizeSlots(input, 3)).toBe(true);
  resizeSlots(input, 6);
  expect(input.slots[5]!.lockedCes).toEqual([null]);
});
