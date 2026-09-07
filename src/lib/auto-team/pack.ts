import { BASE_YIELD, CE_COST } from './constants';
import { getResources } from './resources';
import type { AuraCopies, CeKind, PlannerServant, SlotInput } from './types';
import { servantYield } from './yield';

export interface PackArgs {
  slots: SlotInput[];
  occupiedLocalIndices: number[];
  servantCostSum: number;
  costCap: number;
  ownedTraitCes: number[];
  ownedClassCes: string[];
  ownedGeneric10: boolean;
  team: PlannerServant[];
}
export interface PackResult {
  placements: Array<Array<CeKind | null>>;
  copies: AuraCopies;
  ceCost: number;
}
interface CeSeat {
  slotIndex: number;
  pos: number;
}
export interface Equipment {
  placements: PackResult['placements'];
  copies: AuraCopies;
  ceCost: number;
  localFree: CeSeat[];
  localPaid: CeSeat[];
  support: CeSeat[];
  localOptions: CeKind[];
  supportOptions: CeKind[];
}

export const emptyCopies = (): AuraCopies => ({
  trait: {},
  class: {},
  generic5: 0,
  generic10: 0,
  generic15: 0,
});
export const addCopy = (copies: AuraCopies, ce: CeKind) => {
  if (ce.kind === 'trait') copies.trait[ce.typeId] = (copies.trait[ce.typeId] ?? 0) + 1;
  else if (ce.kind === 'class') copies.class[ce.className] = (copies.class[ce.className] ?? 0) + 1;
  else if (ce.rate === 5) copies.generic5++;
  else if (ce.rate === 10) copies.generic10++;
  else copies.generic15++;
};
export const ceKey = (ce: CeKind) =>
  ce.kind === 'trait'
    ? `t:${ce.typeId}`
    : ce.kind === 'class'
      ? `c:${ce.className}`
      : `g:${ce.rate}`;
export const generic5: CeKind = { kind: 'generic', rate: 5 };
const unlimited = (ce: CeKind) => ce.kind === 'generic' && ce.rate === 5;

type EquipmentArgs = Pick<
  PackArgs,
  'slots' | 'occupiedLocalIndices' | 'ownedTraitCes' | 'ownedClassCes' | 'ownedGeneric10'
>;

/** 锁定先消耗各自来源的库存和实际位置；枚举与固定队伍打包共用。 */
export const prepareEquipment = (args: EquipmentArgs): Equipment => {
  const { traitCeTypes, classCeClasses } = getResources();
  if (
    args.ownedClassCes.some(c => !classCeClasses.includes(c)) ||
    args.ownedTraitCes.some(t => !Number.isInteger(t) || t < 0 || !traitCeTypes.includes(t))
  )
    throw new Error('auto-team: 非法礼装库存');
  const traits = [...new Set(traitCeTypes)].map((typeId): CeKind => ({ kind: 'trait', typeId }));
  const classes = [...new Set(classCeClasses)].map((className): CeKind => ({
    kind: 'class',
    className,
  }));
  const localOptions: CeKind[] = [
    ...[...new Set(args.ownedTraitCes)].map((typeId): CeKind => ({ kind: 'trait', typeId })),
    ...[...new Set(args.ownedClassCes)].map((className): CeKind => ({ kind: 'class', className })),
    ...(args.ownedGeneric10 ? [{ kind: 'generic' as const, rate: 10 as const }] : []),
    generic5,
  ];
  const supportOptions: CeKind[] = [
    ...traits,
    ...classes,
    { kind: 'generic', rate: 15 },
    { kind: 'generic', rate: 10 },
    generic5,
  ];
  const occupied = new Set(args.occupiedLocalIndices);
  const equipment: Equipment = {
    placements: [],
    copies: emptyCopies(),
    ceCost: 0,
    localFree: [],
    localPaid: [],
    support: [],
    localOptions,
    supportOptions,
  };
  const usedLocal = new Set<string>();
  const usedSupport = new Set<string>();
  args.slots.forEach((slot, slotIndex) => {
    const capacity = slot.isCrown ? 2 : 1;
    if ((slot.lockedCes?.length ?? 0) > capacity)
      throw new Error('auto-team: 锁定礼装超出位置容量');
    const active = slot.isSupport || occupied.has(slotIndex);
    if (!active && (slot.lockedServantId !== undefined || slot.lockedCes?.some(Boolean)))
      throw new Error('auto-team: 锁定格必须有从者');
    const row: Array<CeKind | null> = [];
    equipment.placements.push(row);
    if (!active) return;
    for (let pos = 0; pos < capacity; pos++) {
      const ce = slot.lockedCes?.[pos] ?? null;
      row.push(ce);
      const free = slot.isSupport || (slot.isCrown && pos === 0);
      if (ce) {
        const options = slot.isSupport ? supportOptions : localOptions;
        const used = slot.isSupport ? usedSupport : usedLocal;
        const key = ceKey(ce);
        if (!options.some(c => ceKey(c) === key) || (!unlimited(ce) && used.has(key)))
          throw new Error('auto-team: 锁定礼装库存冲突');
        used.add(key);
        addCopy(equipment.copies, ce);
        if (!free) equipment.ceCost += CE_COST;
      } else {
        const target = slot.isSupport
          ? equipment.support
          : free
            ? equipment.localFree
            : equipment.localPaid;
        target.push({ slotIndex, pos });
      }
    }
  });
  equipment.localOptions = localOptions.filter(c => unlimited(c) || !usedLocal.has(ceKey(c)));
  equipment.supportOptions = supportOptions.filter(c => unlimited(c) || !usedSupport.has(ceKey(c)));
  return equipment;
};

/** 恢复已验证的张数配置；本队先免费后付费，锁定位置始终不移动。 */
export const placeEquipment = (
  equipment: Equipment,
  local: CeKind[],
  support: CeKind[],
): PackResult => {
  const seats = [...equipment.localFree, ...equipment.localPaid];
  if (
    local.length < equipment.localFree.length ||
    local.length > seats.length ||
    support.length !== equipment.support.length
  )
    throw new Error('auto-team: 礼装配置容量不符');
  const placements = equipment.placements.map(row => [...row]);
  const copies: AuraCopies = {
    ...equipment.copies,
    trait: { ...equipment.copies.trait },
    class: { ...equipment.copies.class },
  };
  for (const [ces, positions] of [
    [local, seats],
    [support, equipment.support],
  ] as const) {
    ces.forEach((ce, i) => {
      const seat = positions[i]!;
      placements[seat.slotIndex]![seat.pos] = ce;
      addCopy(copies, ce);
    });
  }
  return {
    placements,
    copies,
    ceCost: equipment.ceCost + (local.length - equipment.localFree.length) * CE_COST,
  };
};

/** 固定队伍下，各来源独立取最高全队价值；5%同样参与排序，零收益也填免费位。 */
export const packCraftEssences = (args: PackArgs): PackResult => {
  const equipment = prepareEquipment(args);
  const remaining = args.costCap - args.servantCostSum - equipment.ceCost;
  if (remaining < 0) throw new Error('auto-team: 锁定配置超出 cost 上限');
  const count =
    equipment.localFree.length +
    Math.min(equipment.localPaid.length, Math.floor(remaining / CE_COST));
  const choose = (options: CeKind[], n: number) => {
    const scores = options
      .map(ce => {
        const copies = emptyCopies();
        addCopy(copies, ce);
        const value = args.team.reduce(
          (sum, s) => sum + servantYield(s, copies, 0) - (s.canGainBond ? BASE_YIELD : 0),
          0,
        );
        return { ce, value };
      })
      .sort((a, b) => b.value - a.value);
    const chosen: CeKind[] = [];
    for (const { ce } of scores) {
      const copies = unlimited(ce) ? n - chosen.length : Math.min(1, n - chosen.length);
      for (let i = 0; i < copies; i++) chosen.push(ce);
      if (chosen.length === n) break;
    }
    return chosen;
  };
  return placeEquipment(
    equipment,
    choose(equipment.localOptions, count),
    choose(equipment.supportOptions, equipment.support.length),
  );
};
