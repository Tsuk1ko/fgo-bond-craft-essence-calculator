import { keyBy } from 'es-toolkit';
import data from '@/assets/data.json';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type Servant = Expand<
  Omit<(typeof data.servantList)[number], 'typeComments'> & {
    typeComments?: Record<number, string | undefined>;
  }
>;

export const { typeList } = data;

export const servantList = data.servantList as Servant[];

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
