import { topItems } from './knapsack';
import type { KnapItem, KnapResult } from './knapsack';
import { getResources } from './resources';

export type StarVec = [number, number, number, number, number, number];
const STAR_ORDER = [5, 4, 3, 2, 1, 0] as const;
export const emptyStarVec = (): StarVec => [0, 0, 0, 0, 0, 0];
export const starIndex = (star: number) => 5 - star;
export const cmpStar = (a: StarVec, b: StarVec) => {
  for (let i = 0; i < 6; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
};

/** 仅扣强制礼装后的预算；枚举各星级最便宜前缀，兼顾只锁礼装的最低人数。 */
export const computeStarVector = (
  items: KnapItem[],
  slotsLeft: number,
  costLeft: number,
  minCount = 0,
): StarVec | null => {
  const costs = STAR_ORDER.map(star =>
    items
      .filter(i => i.servant.star === star)
      .flatMap(i => Array.from<number>({ length: Math.min(slotsLeft, i.copies) }).fill(i.cost))
      .sort((a, b) => a - b)
      .slice(0, slotsLeft),
  );
  let best: StarVec | null = null;
  const vec = emptyStarVec();
  const visit = (index: number, count: number, cost: number) => {
    if (cost > costLeft) return;
    if (index === 6) {
      if (count >= minCount && (!best || cmpStar(vec, best) > 0)) best = [...vec];
      return;
    }
    const group = costs[index]!;
    let spent = cost;
    for (let n = 0; n <= group.length && count + n <= slotsLeft; n++) {
      if (n) spent += group[n - 1]!;
      if (spent > costLeft) break;
      vec[index] = n;
      visit(index + 1, count + n, spent);
    }
  };
  visit(0, 0, 0);
  return best;
};

/** 星级向量固定后，仅玛修会产生不同 cost；同时保留两种最高分前缀。 */
export const prepareStarPicks = (items: KnapItem[], need: StarVec) => {
  const mashId = getResources().mashId;
  const mash = items.find(i => i.servant.id === mashId);
  const variants: KnapResult[] = [];
  for (const withMash of [false, true]) {
    if (withMash && (!mash || need[starIndex(mash.servant.star)] === 0)) continue;
    const selected: KnapItem[] = withMash ? [mash!] : [];
    let valid = true;
    for (const star of STAR_ORDER) {
      const count = need[starIndex(star)]! - Number(withMash && star === mash!.servant.star);
      const top = topItems(
        items.filter(i => i.servant.star === star && i.servant.id !== mashId),
        count,
      );
      if (top.length !== count) {
        valid = false;
        break;
      }
      selected.push(...top);
    }
    if (valid)
      variants.push({
        servants: selected.map(i => i.servant),
        value: selected.reduce((s, i) => s + i.value, 0),
        cost: selected.reduce((s, i) => s + i.cost, 0),
      });
  }
  return (budget: number): KnapResult | null => {
    let best: KnapResult | null = null;
    for (const variant of variants) {
      if (
        variant.cost <= budget &&
        (!best ||
          variant.value > best.value ||
          (variant.value === best.value && variant.cost > best.cost))
      )
        best = variant;
    }
    return best;
  };
};
