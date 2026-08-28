import { getResources } from './resources';
import type { KnapItem } from './knapsack';
import type { PlannerServant } from './types';

/** (n5, n4, n3, n2, n1, n0) 字典序：先尽量多 ★5。 */
export type StarVec = [number, number, number, number, number, number];

const STAR_ORDER = [5, 4, 3, 2, 1, 0] as const;

export const emptyStarVec = (): StarVec => [0, 0, 0, 0, 0, 0];

export const starIndex = (star: number) => {
  const i = STAR_ORDER.indexOf(star as (typeof STAR_ORDER)[number]);
  return i >= 0 ? i : 5;
};

export const addStar = (vec: StarVec, star: number, n = 1): StarVec => {
  const next = [...vec] as StarVec;
  next[starIndex(star)] += n;
  return next;
};

export const starVecOf = (servants: PlannerServant[]): StarVec =>
  servants.reduce((v, s) => addStar(v, s.star), emptyStarVec());

export const cmpStar = (a: StarVec, b: StarVec) => {
  for (let i = 0; i < 6; i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return 0;
};

export const sameStar = (a: StarVec, b: StarVec) => cmpStar(a, b) === 0;

/**
 * 忽略付费礼装，用最便宜从者从高星往低星塞，得到最大星级向量 n*。
 */
export const computeStarVector = (
  items: KnapItem[],
  slotsLeft: number,
  costLeft: number,
): StarVec => {
  const n = emptyStarVec();
  const left = items.map(it => ({ ...it, remain: it.copies }));
  for (const star of STAR_ORDER) {
    const group = left
      .filter(it => it.servant.star === star && it.remain > 0)
      .sort((a, b) => a.cost - b.cost);
    for (const g of group) {
      while (g.remain > 0 && slotsLeft > 0 && costLeft >= g.cost) {
        g.remain--;
        slotsLeft--;
        costLeft -= g.cost;
        n[starIndex(star)]++;
      }
    }
  }
  return n;
};

const pickRank = (a: KnapItem, b: KnapItem) => {
  if (a.value !== b.value) return b.value - a.value;
  if (a.cost !== b.cost) return b.cost - a.cost;
  // 同分配时优先通用虚拟，少占职阶配额
  const rank = (s: PlannerServant) =>
    s.kind === 'genericVirtual' ? 0 : s.kind === 'classVirtual' ? 1 : 2;
  return rank(a.servant) - rank(b.servant);
};

const takeTop = (group: KnapItem[], n: number): PlannerServant[] => {
  const sorted = [...group].sort(pickRank);
  const out: PlannerServant[] = [];
  let left = n;
  for (const g of sorted) {
    const t = Math.min(left, g.copies);
    for (let i = 0; i < t; i++) out.push(g.servant);
    left -= t;
    if (left <= 0) break;
  }
  return out;
};

const sumOf = (xs: PlannerServant[], items: KnapItem[], field: 'value' | 'cost') =>
  xs.reduce((acc, s) => {
    const it = items.find(
      i => i.servant.id === s.id && i.servant.kind === s.kind && i.servant.star === s.star,
    );
    return acc + (it?.[field] ?? 0);
  }, 0);

/**
 * 在恰好 n* 下按线性分取人。★4 单独比较带 / 不带玛修。
 */
export const pickByStar = (items: KnapItem[], need: StarVec): PlannerServant[] => {
  const mashId = getResources().mashId;
  const picked: PlannerServant[] = [];

  for (const star of [5, 3, 2, 1, 0] as const) {
    picked.push(
      ...takeTop(
        items.filter(i => i.servant.star === star),
        need[starIndex(star)]!,
      ),
    );
  }

  const n4 = need[starIndex(4)]!;
  const group4 = items.filter(i => i.servant.star === 4);
  const mash = group4.find(i => i.servant.id === mashId);
  const others = group4.filter(i => i.servant.id !== mashId);

  if (n4 <= 0) return picked;
  if (!mash || n4 < 1) {
    picked.push(...takeTop(group4, n4));
    return picked;
  }

  const withMash = [mash.servant, ...takeTop(others, n4 - 1)];
  const without = takeTop(others, n4);
  const withKey = [sumOf(withMash, items, 'value'), sumOf(withMash, items, 'cost')] as const;
  const withoutKey = [sumOf(without, items, 'value'), sumOf(without, items, 'cost')] as const;
  const useMash =
    without.length < n4 ||
    withKey[0] > withoutKey[0] ||
    (withKey[0] === withoutKey[0] && withKey[1] >= withoutKey[1]);
  picked.push(...(useMash && withMash.length === n4 ? withMash : without));
  return picked;
};
