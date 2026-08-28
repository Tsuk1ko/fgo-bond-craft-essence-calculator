import type { PlannerServant } from './types';

export interface KnapItem {
  servant: PlannerServant;
  value: number;
  cost: number;
  copies: number;
}

export interface KnapResult {
  servants: PlannerServant[];
  value: number;
  cost: number;
}

type Cell = {
  value: number;
  cost: number;
  take: number;
  item: number;
  prevK: number;
  prevW: number;
};

const better = (a: Cell, b: Cell) => a.value > b.value || (a.value === b.value && a.cost > b.cost);

/**
 * 人数 + cost 的分组背包。
 * 状态 dp[k][w]：已选 k 人、花费 w 时的 (收益, cost)。
 * 转移：对每件物品取 0～copies 份。字典序先收益后 cost。
 */
export const knapsackSelect = (
  items: KnapItem[],
  maxCount: number,
  maxCost: number,
): KnapResult => {
  if (maxCount <= 0 || maxCost < 0) return { servants: [], value: 0, cost: 0 };

  const dead: Cell = { value: -1, cost: 0, take: 0, item: -1, prevK: -1, prevW: -1 };
  const dp: Cell[][] = Array.from({ length: maxCount + 1 }, () =>
    Array.from({ length: maxCost + 1 }, () => ({ ...dead })),
  );
  dp[0][0] = { value: 0, cost: 0, take: 0, item: -1, prevK: -1, prevW: -1 };

  items.forEach((item, idx) => {
    for (let k = maxCount; k >= 0; k--) {
      for (let w = maxCost; w >= 0; w--) {
        const cur = dp[k]![w]!;
        if (cur.value < 0) continue;
        for (let t = 1; t <= item.copies; t++) {
          const nk = k + t;
          const nw = w + item.cost * t;
          if (nk > maxCount || nw > maxCost) break;
          const cand: Cell = {
            value: cur.value + item.value * t,
            cost: cur.cost + item.cost * t,
            take: t,
            item: idx,
            prevK: k,
            prevW: w,
          };
          if (dp[nk]![nw]!.value < 0 || better(cand, dp[nk]![nw]!)) dp[nk]![nw] = cand;
        }
      }
    }
  });

  let best: Cell | null = null;
  let bk = 0;
  let bw = 0;
  for (let k = 0; k <= maxCount; k++) {
    for (let w = 0; w <= maxCost; w++) {
      const cell = dp[k]![w]!;
      if (cell.value < 0) continue;
      if (!best || better(cell, best)) {
        best = cell;
        bk = k;
        bw = w;
      }
    }
  }
  if (!best) return { servants: [], value: 0, cost: 0 };

  const servants: PlannerServant[] = [];
  let k = bk;
  let w = bw;
  while (k > 0 && dp[k]![w]!.item >= 0) {
    const cell = dp[k]![w]!;
    const item = items[cell.item]!;
    for (let i = 0; i < cell.take; i++) servants.push(item.servant);
    k = cell.prevK;
    w = cell.prevW;
  }
  return { servants, value: best.value, cost: best.cost };
};
