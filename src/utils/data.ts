import { keyBy } from 'es-toolkit';
import data from '@/assets/data.json';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type Servant = Expand<
  Omit<(typeof data.servantList)[number], 'typeComments'> & {
    typeComments?: Record<number, string | undefined>;
  }
>;

export interface TypeItem {
  id: number;
  name: string;
}

export const { typeList } = data;

const CLASS_BONUS_ID_START = -99;

export const classBonusList = ['Caster', 'Rider', 'Saber'] as const;

const classBonusItems: TypeItem[] = classBonusList.map((name, i) => ({
  id: CLASS_BONUS_ID_START + i,
  name,
}));

export const typeItems: TypeItem[] = [
  ...classBonusItems,
  ...typeList.map((name, id) => ({ id, name })),
];

export const allTypeCount = typeItems.length;

const typeNameMap = new Map<number, string>(typeItems.map(({ id, name }) => [id, name]));

const classBonusIdMap = new Map<string, number>(classBonusItems.map(({ id, name }) => [name, id]));

export const getTypeName = (id: number) => typeNameMap.get(id) ?? String(id);

export const servantList = (data.servantList as Servant[]).map(s => {
  const classTypeId = classBonusIdMap.get(s.class);
  if (classTypeId === undefined) return s;
  return { ...s, types: [classTypeId, ...s.types] };
});

export const servantMap = keyBy(servantList, ({ id }) => id);

export const classList = [
  'Saber',
  'Archer',
  'Lancer',
  'Rider',
  'Caster',
  'Assassin',
  'Berserker',
  'Shielder',
  'Ruler',
  'Avenger',
  'MoonCancer',
  'Alterego',
  'Foreigner',
  'Pretender',
  'Beast',
];

export const classSortIndex = Object.fromEntries(classList.map((v, i) => [v, i]));
