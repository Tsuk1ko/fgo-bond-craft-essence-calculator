import { getResources } from './resources';
import type { CatalogServant } from './types';

/** 本项目羁绊礼装一律 16 cost。 */
export const CE_COST = 16;

/** 虚拟从者每个星级的默认配额（一队最多 6 人）。 */
export const DEFAULT_QUOTA = 6;

export const TRAIT_CE_RATE = 20;
export const CLASS_CE_RATE = 20;
export const GENERIC_5_RATE = 5;
export const GENERIC_10_RATE = 10;
export const GENERIC_15_RATE = 15;
export const BOND15_RATE = 25;
export const BASE_YIELD = 100;

export const VIRTUAL_STARS = [1, 2, 3, 4, 5] as const;

const STAR_COST: Record<number, number> = {
  5: 16,
  4: 12,
  3: 7,
  2: 4,
  0: 4,
  1: 3,
};

/**
 * 从者 cost：按星级表；玛修（init 传入的 mashId）即使 ★4 也是 0。
 */
export const servantCost = ({ id, star }: Pick<CatalogServant, 'id' | 'star'>): number => {
  if (id === getResources().mashId) return 0;
  return STAR_COST[star] ?? 0;
};
