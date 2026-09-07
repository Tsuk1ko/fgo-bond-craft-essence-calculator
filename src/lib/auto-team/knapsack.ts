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

/** 同 cost 只保留最多 maxCount 份；同分时沿用通用虚拟优先的约定。 */
export const topItems = (items: KnapItem[], maxCount: number): KnapItem[] => {
  const rank = (s: PlannerServant) =>
    s.kind === 'genericVirtual' ? 0 : s.kind === 'classVirtual' ? 1 : 2;
  const top: KnapItem[] = [];
  for (const item of items) {
    for (let copy = 0; copy < Math.min(maxCount, item.copies); copy++) {
      let pos = 0;
      while (
        pos < top.length &&
        (top[pos]!.value > item.value ||
          (top[pos]!.value === item.value && rank(top[pos]!.servant) <= rank(item.servant)))
      )
        pos++;
      if (pos >= maxCount) break;
      top.splice(pos, 0, item);
      if (top.length > maxCount) top.pop();
    }
  }
  return top;
};

/** 固定选择性光环后，一次建立所有精确人数/预算的最优前缀，供通用礼装配置复用。 */
export const prepareKnapsack = (items: KnapItem[], maxCount: number, maxCost: number) => {
  const byCost = new Map<number, KnapItem[]>();
  for (const item of items) {
    const group = byCost.get(item.cost) ?? [];
    group.push(item);
    byCost.set(item.cost, group);
  }
  const groups = [...byCost].map(([cost, xs]) => {
    const top = topItems(xs, maxCount);
    const prefix = [0];
    for (const item of top) prefix.push(prefix.at(-1)! + item.value);
    return { cost, top, prefix };
  });
  interface Choice {
    value: number;
    cost: number;
    counts: number[];
    result?: KnapResult;
  }
  const best: Array<Array<Choice | undefined>> = Array.from({ length: maxCount + 1 }, () =>
    Array.from({ length: maxCost + 1 }),
  );
  const counts: number[] = [];
  const visit = (i: number, count: number, cost: number, value: number) => {
    if (i === groups.length) {
      const old = best[count]![cost];
      if (!old || value > old.value) best[count]![cost] = { value, cost, counts: [...counts] };
      return;
    }
    const group = groups[i]!;
    for (let n = 0; n < group.prefix.length && count + n <= maxCount; n++) {
      const spent = cost + n * group.cost;
      if (spent > maxCost) break;
      counts[i] = n;
      visit(i + 1, count + n, spent, value + group.prefix[n]!);
    }
  };
  visit(0, 0, 0, 0);
  for (const row of best) {
    for (let w = 1; w <= maxCost; w++) {
      const prev = row[w - 1];
      const cur = row[w];
      if (
        prev &&
        (!cur || prev.value > cur.value || (prev.value === cur.value && prev.cost > cur.cost))
      )
        row[w] = prev;
    }
  }
  return (count: number, budget: number): KnapResult | null => {
    const choice = best[count]?.[Math.min(maxCost, budget)];
    if (!choice) return null;
    return (choice.result ??= {
      value: choice.value,
      cost: choice.cost,
      servants: groups.flatMap((group, i) =>
        group.top.slice(0, choice.counts[i]).map(x => x.servant),
      ),
    });
  };
};

/** 恰好 count 人；人数不足或预算不可行时返回 null。 */
export const knapsackSelect = (
  items: KnapItem[],
  count: number,
  maxCost: number,
): KnapResult | null =>
  maxCost < 0 ? null : prepareKnapsack(items, count, maxCost)(count, maxCost);
