import data from '../../assets/data.json';
import { classBonusList, classList } from '../../utils/data';
import type { PlannerResources } from './types';

// 求解器使用原始图鉴，避免混入查看器的职阶特性 id 与虚拟条目。
export const plannerResources: PlannerResources = {
  servants: data.servantList,
  traitCeTypes: data.typeList.map((_, id) => id),
  classCeClasses: [...classBonusList],
  classList,
  mashId: 1,
};
