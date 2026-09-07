import { expect, test } from 'bun:test';
import { knapsackSelect, prepareKnapsack } from '../knapsack';
import type { KnapItem } from '../knapsack';

test('精确人数、预算和有限份数与1000组独立穷举一致', () => {
  let seed = 20260907;
  const random = (n: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  for (let trial = 0; trial < 1000; trial++) {
    const items: KnapItem[] = Array.from({ length: 8 }, (_, id) => ({
      servant: { id, kind: 'real', class: 'Saber', star: 1, types: [], canGainBond: true },
      value: random(25) * 5,
      cost: [0, 3, 4, 7, 12, 16][random(6)]!,
      copies: 1 + random(2),
    }));
    const count = random(7);
    const budget = random(119);
    let value = -1;
    let cost = -1;
    const visit = (i: number, n: number, spent: number, score: number) => {
      if (i === items.length) {
        if (n === count && (score > value || (score === value && spent > cost))) {
          value = score;
          cost = spent;
        }
        return;
      }
      const item = items[i]!;
      for (let t = 0; t <= item.copies && n + t <= count && spent + t * item.cost <= budget; t++)
        visit(i + 1, n + t, spent + t * item.cost, score + t * item.value);
    };
    visit(0, 0, 0, 0);
    const actual = knapsackSelect(items, count, budget);
    if (value < 0) {
      expect(actual).toBeNull();
      continue;
    }
    expect(actual).not.toBeNull();
    expect([actual!.value, actual!.cost, actual!.servants.length]).toEqual([value, cost, count]);
    const chosen = actual!.servants.map(s => items[s.id]!);
    expect(chosen.reduce((sum, i) => sum + i.value, 0)).toBe(value);
    expect(chosen.reduce((sum, i) => sum + i.cost, 0)).toBe(cost);
    for (const item of items)
      expect(chosen.filter(i => i === item).length).toBeLessThanOrEqual(item.copies);
  }
});

test('前缀预算查询保留更贵的同收益解，低预算和不足人数返回null', () => {
  const items: KnapItem[] = [3, 4, 7].map((cost, id) => ({
    servant: { id, kind: 'real', class: 'Archer', star: 1, types: [], canGainBond: true },
    cost,
    value: 100,
    copies: 1,
  }));
  const pick = prepareKnapsack(items, 3, 20);
  expect(pick(2, 6)).toBeNull();
  expect(pick(2, 8)?.cost).toBe(7);
  expect(pick(2, 10)?.cost).toBe(10);
  expect(pick(2, 11)?.cost).toBe(11);
  expect(pick(4, 20)).toBeNull();
  expect(knapsackSelect(items, 0, -1)).toBeNull();
});
