import { DEFAULT_QUOTA, VIRTUAL_STARS } from './constants';
import { getResources } from './resources';
import type { PlannerInput, PlannerServant } from './types';

/**
 * 职阶虚拟从者 id：新号段，避开查看器的 -99。
 * 同一职阶同一星级共用一个种类 id，上场份数由配额约束。
 */
const classVirtualId = (classIndex: number, star: number) => -(1000 + classIndex * 10 + star);

/** 通用虚拟从者 id：按星级区分。 */
const genericVirtualId = (star: number) => -(2000 + star);

const passesStar = (star: number, selectedStars: number[]) =>
  selectedStars.length === 0 || selectedStars.includes(star);

const quotaOf = (input: PlannerInput, className: string | null, star: number) => {
  if (className === null) {
    return input.quotaGeneric?.[star] ?? DEFAULT_QUOTA;
  }
  return input.quotaClass?.[className]?.[star] ?? DEFAULT_QUOTA;
};

/**
 * 当前职阶范围：有筛选则为筛选集，否则为 init 的全职阶表。
 * 通用虚拟从者只在这个范围里「存在没有职阶礼装的职阶」时进池。
 */
const activeClasses = (input: PlannerInput): string[] => {
  const { classList } = getResources();
  return input.selectedClasses.length ? input.selectedClasses : classList;
};

const toReal = (id: number, cls: string, star: number, types: number[]): PlannerServant => ({
  id,
  kind: 'real',
  class: cls,
  star,
  types,
  canGainBond: true,
});

/**
 * 构造配队池：图鉴 ∩ 库存 − 隐藏，再套职阶/星级筛选；
 * 然后按礼装库存与配额生成职阶 / 通用虚拟从者。
 */
export const buildVirtualPool = (input: PlannerInput): PlannerServant[] => {
  const { servants, classCeClasses, classList } = getResources();
  const classSet = new Set(classCeClasses);
  const ownedClass = new Set(input.ownedClassCes);
  const hidden = new Set(input.hiddenIds);
  const owned = new Set(input.servantIds);
  const range = activeClasses(input);

  const reals: PlannerServant[] = servants
    .filter(s => owned.has(s.id) && !hidden.has(s.id))
    .filter(s => input.selectedClasses.length === 0 || input.selectedClasses.includes(s.class))
    .filter(s => passesStar(s.star, input.selectedStars))
    .map(s => {
      const commentTypes = s.typeComments ? Object.keys(s.typeComments).map(Number) : [];
      const types = [...new Set([...s.types, ...commentTypes])];
      return toReal(s.id, s.class, s.star, types);
    });

  const virtuals: PlannerServant[] = [];

  // 职阶虚拟：库存有该职阶礼装，且该职阶在当前范围内，且星级/配额通过。
  for (const [classIndex, className] of classList.entries()) {
    if (!classSet.has(className)) continue;
    if (!ownedClass.has(className)) continue;
    if (!range.includes(className)) continue;
    for (const star of VIRTUAL_STARS) {
      if (!passesStar(star, input.selectedStars)) continue;
      if (quotaOf(input, className, star) <= 0) continue;
      virtuals.push({
        id: classVirtualId(classIndex, star),
        kind: 'classVirtual',
        class: className,
        star,
        types: [],
        canGainBond: true,
      });
    }
  }

  // 通用虚拟：当前范围里存在「没有职阶礼装」的职阶（如 Archer），且配额/星级通过。
  const hasNonClassCe = range.some(c => !classSet.has(c));
  if (hasNonClassCe) {
    for (const star of VIRTUAL_STARS) {
      if (!passesStar(star, input.selectedStars)) continue;
      if (quotaOf(input, null, star) <= 0) continue;
      virtuals.push({
        id: genericVirtualId(star),
        kind: 'genericVirtual',
        class: null,
        star,
        types: [],
        canGainBond: true,
      });
    }
  }

  return [...reals, ...virtuals];
};
