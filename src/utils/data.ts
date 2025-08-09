import data from '@/assets/data.json';
import { uniq } from 'es-toolkit';

export const { typeList, servantList } = data;

export const classList = uniq(servantList.map(s => s.class));
