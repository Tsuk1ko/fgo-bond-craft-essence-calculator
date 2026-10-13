import { ceKey } from './pack';
import type { CeKind, CeLock, PlannerInput, PlannerResources, SlotInput } from './types';

const newSlot = (): SlotInput => ({ isSupport: false, isCrown: false, lockedCes: [null] });
const quotaRow = () => Object.fromEntries([1, 2, 3, 4, 5].map(star => [star, 6]));

export const createPlannerInput = (resources: PlannerResources): PlannerInput => ({
  slots: Array.from({ length: 6 }, newSlot),
  costCap: 113,
  starPriority: false,
  servantIds: resources.servants.filter(s => s.id > 0).map(s => s.id),
  hiddenIds: [],
  selectedClasses: [],
  selectedStars: [],
  ownedTraitCes: [],
  ownedClassCes: [],
  ownedGeneric10: false,
  quotaClass: Object.fromEntries(resources.classCeClasses.map(name => [name, quotaRow()])),
  quotaGeneric: quotaRow(),
});

export const resizeSlots = (input: PlannerInput, count: number) => {
  const removedLocks = input.slots
    .slice(count)
    .some(s => s.lockedServantId !== undefined || s.lockedCes?.some(Boolean));
  input.slots = input.slots.slice(0, count);
  while (input.slots.length < count) input.slots.push(newSlot());
  return removedLocks;
};

export const lockServant = (input: PlannerInput, index: number, id: number | undefined) => {
  const conflict = input.slots.findIndex(
    (s, i) => i !== index && id !== undefined && s.lockedServantId === id,
  );
  if (conflict >= 0) return conflict;
  const slot = input.slots[index]!;
  slot.lockedServantId = id;
  slot.bond15 = false;
  slot.bondCap16 = false;
};

export const setCrown = (slot: SlotInput, enabled: boolean) => {
  const removedLock = !enabled && Boolean(slot.lockedCes?.[1]);
  slot.isCrown = enabled;
  slot.lockedCes = enabled ? [slot.lockedCes?.[0] ?? null, null] : [slot.lockedCes?.[0] ?? null];
  return removedLock;
};

export const isOwnedCe = (input: PlannerInput, ce: CeKind) =>
  ce.kind === 'class'
    ? input.ownedClassCes.includes(ce.className)
    : ce.kind === 'trait'
      ? input.ownedTraitCes.includes(ce.typeId)
      : ce.rate === 5 || (ce.rate === 10 && input.ownedGeneric10);

export const ceConflict = (input: PlannerInput, index: number, pos: number, ce: CeLock) => {
  if (!ce || ce === 'empty' || (ce.kind === 'generic' && ce.rate === 5)) return -1;
  return input.slots.findIndex(
    (s, i) =>
      s.isSupport === input.slots[index]!.isSupport &&
      s.lockedCes?.some(
        (other, p) =>
          (i !== index || p !== pos) && other && other !== 'empty' && ceKey(other) === ceKey(ce),
      ),
  );
};

export const lockCe = (input: PlannerInput, index: number, pos: number, ce: CeLock) => {
  const conflict = ceConflict(input, index, pos, ce);
  if (conflict >= 0) return conflict;
  const slot = input.slots[index]!;
  slot.lockedCes ??= Array.from<CeLock>({ length: slot.isCrown ? 2 : 1 }).fill(null);
  slot.lockedCes[pos] = ce;
};

/** 库存或助战来源改变后，解除失效锁定，返回数量供页面明确提示。 */
export const reconcileCeLocks = (input: PlannerInput) => {
  let removed = 0;
  const used = { local: new Set<string>(), support: new Set<string>() };
  for (const slot of input.slots) {
    slot.lockedCes = slot.lockedCes?.map(ce => {
      if (!ce || ce === 'empty') return ce;
      const keys = slot.isSupport ? used.support : used.local;
      const key = ceKey(ce);
      const limited = ce.kind !== 'generic' || ce.rate !== 5;
      if ((!slot.isSupport && !isOwnedCe(input, ce)) || (limited && keys.has(key))) {
        removed++;
        return null;
      }
      keys.add(key);
      return ce;
    });
  }
  return removed;
};

export const setSupport = (input: PlannerInput, index: number, enabled: boolean) => {
  const slot = input.slots[index]!;
  let removed = 0;
  if (enabled) {
    input.slots.forEach(s => {
      s.isSupport = false;
    });
    if (slot.lockedServantId !== undefined) removed++;
    lockServant(input, index, undefined);
  }
  slot.isSupport = enabled;
  return removed + reconcileCeLocks(input);
};
