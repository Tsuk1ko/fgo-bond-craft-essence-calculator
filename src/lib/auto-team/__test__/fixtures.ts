import type { CatalogServant, PlannerInput, PlannerResources, SlotInput } from '../types';

export const FIXTURE_CLASS_LIST = [
  'Saber',
  'Archer',
  'Lancer',
  'Rider',
  'Caster',
  'Assassin',
  'Berserker',
  'Shielder',
];

export const fixtureResources = (servants: CatalogServant[]): PlannerResources => ({
  servants,
  classCeClasses: ['Caster', 'Rider', 'Saber'],
  classList: FIXTURE_CLASS_LIST,
  mashId: 1,
});

export const catalog = {
  mash: { id: 1, class: 'Shielder', star: 4, types: [1, 2, 3, 4] },
  rider5: { id: 10, class: 'Rider', star: 5, types: [0] },
  archer5: { id: 20, class: 'Archer', star: 5, types: [] as number[] },
  caster3: { id: 30, class: 'Caster', star: 3, types: [] as number[] },
  saber1: { id: 40, class: 'Saber', star: 1, types: [2] },
  caster1: { id: 31, class: 'Caster', star: 1, types: [] as number[] },
  assassin5: { id: 50, class: 'Assassin', star: 5, types: [] as number[] },
  assassin1Trait: { id: 60, class: 'Assassin', star: 1, types: [0, 1, 2] },
  assassin4Empty: { id: 51, class: 'Assassin', star: 4, types: [] as number[] },
};

export const localSlot = (isCrown = false): SlotInput => ({
  isSupport: false,
  isCrown,
});

export const supportSlot = (isCrown = false): SlotInput => ({
  isSupport: true,
  isCrown,
});

export const baseInput = (overrides: Partial<PlannerInput> = {}): PlannerInput => ({
  slots: [localSlot(), localSlot(), localSlot()],
  costCap: 118,
  starPriority: false,
  servantIds: [],
  hiddenIds: [],
  selectedClasses: [],
  selectedStars: [],
  ownedTraitCes: [],
  ownedClassCes: [],
  ownedGeneric10: false,
  ...overrides,
});
