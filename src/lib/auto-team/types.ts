/** 图鉴中的真从者，字段对齐 data.json 的 servantList（不含查看器虚拟从者）。 */
export interface CatalogServant {
  id: number;
  class: string;
  star: number;
  types: number[];
  /** 灵衣等条件特性，仍视为具备该特性 */
  typeComments?: Record<number, string | undefined>;
}

/**
 * 经 init 写入模块全局的不变资源。
 * solve 之后的逻辑通过 getResources() 取用，不再往下传。
 */
export interface PlannerResources {
  /** 图鉴真从者 */
  servants: CatalogServant[];
  /** 有职阶礼装的职阶，如 Caster / Rider / Saber */
  classCeClasses: string[];
  /** 全职阶表：职阶筛选为空时的「当前职阶范围」 */
  classList: string[];
  /** 玛修 id，cost 特例为 0 */
  mashId: number;
}

/** 礼装种类：特性 / 职阶 / 通用。 */
export type CeKind =
  | { kind: 'trait'; typeId: number }
  | { kind: 'class'; className: string }
  | { kind: 'generic'; rate: 5 | 10 | 15 };

export interface SlotInput {
  isSupport: boolean;
  isCrown: boolean;
  lockedServantId?: number;
  lockedCes?: CeKind[];
  /** 仅锁定从者可设：是否提供羁绊15光环 */
  bond15?: boolean;
  /** 仅锁定从者可设：是否开放 16 上限（可获羁绊） */
  bondCap16?: boolean;
}

/**
 * 单次规划变量。筛选与库存都从这里进，不进全局。
 */
export interface PlannerInput {
  /** 队伍位置 3～6，至多一个助战格 */
  slots: SlotInput[];
  costCap: number;
  starPriority: boolean;
  /** 真从者库存名单（图鉴 id）；锁定 id 即使不在名单内也强制上场 */
  servantIds: number[];
  hiddenIds: number[];
  /** 空 = 不限制 */
  selectedClasses: string[];
  /** 空 = 不限制 */
  selectedStars: number[];
  ownedTraitCes: number[];
  ownedClassCes: string[];
  ownedGeneric10: boolean;
  /** 职阶虚拟从者配额 [职阶][星级]，缺省每档 6 */
  quotaClass?: Record<string, Partial<Record<number, number>>>;
  /** 通用虚拟从者配额 [星级]，缺省每档 6 */
  quotaGeneric?: Partial<Record<number, number>>;
}

export type ServantKind = 'real' | 'classVirtual' | 'genericVirtual';

export interface PlannerServant {
  id: number;
  kind: ServantKind;
  /** 通用虚拟从者为 null */
  class: string | null;
  star: number;
  types: number[];
  canGainBond: boolean;
}

export interface PlannedSlot {
  slotIndex: number;
  /** 助战格从者恒为 null */
  servant: PlannerServant | null;
  ces: Array<CeKind | null>;
}

export interface PlannerResult {
  slots: PlannedSlot[];
  /** 百分点整数：100 表示 100% */
  totalYield: number;
  usedCost: number;
}

/** 场上各礼装佩戴张数，供计分用。 */
export interface AuraCopies {
  trait: Record<number, number>;
  class: Record<string, number>;
  generic5: number;
  generic10: number;
  generic15: number;
}
