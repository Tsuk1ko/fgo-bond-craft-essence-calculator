import { beforeEach, describe, expect, test } from 'bun:test';
import { servantCost } from '../constants';
import { getResources, init, resetResources } from '../resources';
import { fixtureResources } from './fixtures';

describe('init / getResources', () => {
  test('未 init 时 getResources 抛错', () => {
    resetResources();
    expect(() => getResources()).toThrow();
  });
});

describe('servantCost', () => {
  beforeEach(() => {
    resetResources();
    init(fixtureResources([]));
  });

  test('按星级计算 cost，玛修即使 ★4 也是 0', () => {
    expect(servantCost({ id: 10, star: 5 })).toBe(16);
    expect(servantCost({ id: 10, star: 4 })).toBe(12);
    expect(servantCost({ id: 10, star: 3 })).toBe(7);
    expect(servantCost({ id: 10, star: 2 })).toBe(4);
    expect(servantCost({ id: 10, star: 0 })).toBe(4);
    expect(servantCost({ id: 10, star: 1 })).toBe(3);
    expect(servantCost({ id: 1, star: 4 })).toBe(0);
  });
});
