import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import data from '../../src/assets/data.json';
import {
  baseInput,
  fixtureResources,
  localSlot,
  supportSlot,
} from '../../src/lib/auto-team/__test__/fixtures.ts';
import { servantCost } from '../../src/lib/auto-team/constants.ts';
import { knapsackSelect, prepareKnapsack } from '../../src/lib/auto-team/knapsack.ts';
import type { KnapItem } from '../../src/lib/auto-team/knapsack.ts';
import { emptyCopies } from '../../src/lib/auto-team/pack.ts';
import { init } from '../../src/lib/auto-team/resources.ts';
import { solve } from '../../src/lib/auto-team/solve.ts';
import type { CatalogServant, PlannerInput } from '../../src/lib/auto-team/types.ts';
import { servantYield } from '../../src/lib/auto-team/yield.ts';

init({
  ...fixtureResources(data.servantList),
  traitCeTypes: data.typeList.map((_, id) => id),
  classList: [...new Set(data.servantList.map(s => s.class))],
});
const mode = process.argv[2] ?? 'kernel';
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
const measure = <T>(fn: () => T) => {
  fn();
  const samplesMs: number[] = [];
  let result: T;
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    result = fn();
    samplesMs.push(performance.now() - start);
  }
  return { samplesMs, medianMs: median(samplesMs), result: result! };
};

if (mode === 'repros') {
  const noVirtual = {
    quotaGeneric: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    quotaClass: Object.fromEntries(
      ['Saber', 'Rider', 'Caster'].map(c => [c, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }]),
    ),
  };
  const run = (name: string, servants: CatalogServant[], overrides: Partial<PlannerInput>) => {
    init(fixtureResources(servants));
    const result = solve(
      baseInput({ ...noVirtual, costCap: 56, servantIds: servants.map(s => s.id), ...overrides }),
    );
    console.log(JSON.stringify({ name, ...result }));
    return result;
  };
  const duplicate = run(
    'duplicate-real',
    [
      { id: 10, class: 'Saber', star: 1, types: [] },
      { id: 20, class: 'Saber', star: 1, types: [0] },
    ],
    { slots: [localSlot(true), localSlot(), localSlot()], ownedTraitCes: [0] },
  );
  assert.deepEqual(
    duplicate.slots.flatMap(s => (s.servant ? [s.servant.id] : [])).sort((a, b) => a - b),
    [10, 20],
  );
  const five = Array.from({ length: 5 }, (_, i) => ({
    id: 10 + i,
    class: 'Archer',
    star: 1,
    types: i === 0 ? [0] : [],
  }));
  const premium = run('premium-worse-than-5', five, {
    slots: five.map(s => ({ ...localSlot(), lockedServantId: s.id })),
    ownedTraitCes: [0],
  });
  assert.equal(premium.totalYield, 550);
  const casters = [
    { id: 10, class: 'Caster', star: 1, types: [] },
    { id: 20, class: 'Caster', star: 1, types: [] },
  ];
  const support = run('unowned-support-ce', casters, {
    slots: [...casters.map(s => ({ ...localSlot(), lockedServantId: s.id })), supportSlot()],
  });
  assert.equal(support.totalYield, 260);
  const expensive = [10, 20, 30].map(id => ({ id, class: 'Archer', star: 5, types: [] }));
  for (const starPriority of [false, true]) {
    const over = run('locked-ce-over-budget', expensive, {
      starPriority,
      slots: [
        { ...localSlot(), lockedServantId: 10, lockedCes: [{ kind: 'generic', rate: 5 }] },
        { ...localSlot(), lockedServantId: 20 },
        localSlot(),
      ],
    });
    assert.equal(over.usedCost, 48);
    assert.equal(over.totalYield, 210);
  }
  const mash = run(
    'mash-replaces-best-four-star',
    [
      { id: 10, class: 'Archer', star: 5, types: [0] },
      { id: 20, class: 'Archer', star: 5, types: [0] },
      { id: 30, class: 'Archer', star: 4, types: [0] },
      { id: 40, class: 'Archer', star: 4, types: [] },
      { id: 1, class: 'Shielder', star: 4, types: [] },
    ],
    {
      costCap: 60,
      starPriority: true,
      ownedTraitCes: [0],
      slots: [
        { ...localSlot(), lockedServantId: 10 },
        { ...localSlot(), lockedServantId: 20 },
        localSlot(),
        localSlot(),
      ],
    },
  );
  assert.equal(mash.totalYield, 460);
  console.log('Five corrected regression cases passed.');
} else if (mode === 'kernel') {
  let seed = 20260907;
  const rand = (n: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  const configs = Array.from({ length: 100 }, () => {
    const copies = emptyCopies();
    for (let t = 0; t < 8; t++) copies.trait[t] = rand(3);
    for (const cls of ['Saber', 'Rider', 'Caster']) copies.class[cls] = rand(3);
    return data.servantList.map((s): KnapItem => {
      const servant = {
        ...s,
        types: [...new Set([...s.types, ...Object.keys(s.typeComments ?? {}).map(Number)])],
        kind: 'real' as const,
        canGainBond: true,
      };
      return { servant, cost: servantCost(s), value: servantYield(servant, copies, 0), copies: 1 };
    });
  });
  const single = measure(() =>
    configs.reduce((sum, items) => {
      const selected = knapsackSelect(items, 6, 86)!;
      assert.equal(new Set(selected.servants.map(s => s.id)).size, 6);
      return sum + selected.value + selected.cost;
    }, 0),
  );
  const reused = measure(() =>
    configs.reduce((sum, items) => {
      const pick = prepareKnapsack(items, 6, 118);
      for (let k = 0; k <= 6; k++)
        for (const budget of [56, 80, 86, 118]) {
          const result = pick(k, budget);
          if (result) sum += result.value + result.cost;
        }
      return sum;
    }, 0),
  );
  console.log(
    JSON.stringify({
      runtime: Bun.version,
      cpu: cpus()[0]?.model,
      pool: 436,
      configs: 100,
      single,
      reused,
    }),
  );
} else {
  const run = (inventory: number, crown: string, costCap: number, starPriority: boolean) => {
    const input = baseInput({
      slots: [
        ...Array.from({ length: 5 }, () => localSlot(crown === 'all')),
        supportSlot(crown !== 'none'),
      ],
      costCap,
      starPriority,
      servantIds: data.servantList.map(s => s.id),
      ownedTraitCes: Array.from({ length: Math.min(8, inventory) }, (_, i) => i),
      ownedClassCes: inventory >= 11 ? ['Caster', 'Rider', 'Saber'] : [],
      ownedGeneric10: inventory >= 12,
    });
    const measured = measure(() => {
      const result = solve(input);
      const ids = result.slots.flatMap(s => (s.servant?.kind === 'real' ? [s.servant.id] : []));
      assert.equal(new Set(ids).size, ids.length);
      assert(result.usedCost <= costCap);
      return { totalYield: result.totalYield, usedCost: result.usedCost };
    });
    return { inventory, crown, costCap, starPriority, ...measured };
  };
  if (mode === 'matrix') {
    const rows: ReturnType<typeof run>[] = [];
    for (const inventory of [0, 3, 8, 12])
      for (const costCap of [56, 80, 118]) {
        for (const crown of ['none', 'support', 'all'])
          for (const starPriority of [false, true]) {
            const row = run(inventory, crown, costCap, starPriority);
            rows.push(row);
            console.log(JSON.stringify(row));
          }
      }
    if (process.argv[3])
      writeFileSync(
        process.argv[3],
        `${JSON.stringify({ runtime: Bun.version, cpu: cpus()[0]?.model, rows }, null, 2)}\n`,
      );
  } else {
    console.log(
      JSON.stringify(
        run(
          Number(mode),
          process.argv[3] === 'crown' ? 'support' : (process.argv[3] ?? 'none'),
          Number(process.argv[4] ?? 118),
          process.argv[5] === 'star',
        ),
      ),
    );
  }
}
