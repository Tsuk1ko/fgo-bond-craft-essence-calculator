import type { PlannerResources } from './types';

let resources: PlannerResources | undefined;

/** 写入不变资源。重复调用会覆盖，便于测试重灌夹具。 */
export const init = (next: PlannerResources) => {
  resources = next;
};

/** 测试用：清掉全局，模拟尚未 init。 */
export const resetResources = () => {
  resources = undefined;
};

/** solve 之后的逻辑都从这里取图鉴 / 职阶礼装职阶等。未 init 则抛错。 */
export const getResources = (): PlannerResources => {
  if (!resources) {
    throw new Error('auto-team: 尚未 init，不能取用不变资源');
  }
  return resources;
};
