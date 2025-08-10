import data from '@/assets/data.json';

export const { typeList, servantList } = data;

export type Servant = Omit<(typeof servantList)[number], 'typeComments'> & {
  typeComments?: Record<number, string | undefined>;
};

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
