<template>
  <div class="type-combination">
    <el-dropdown
      v-for="group in typeCombinationGroups"
      :key="group.k"
      trigger="click"
      placement="bottom-start"
      :show-arrow="false"
      :popper-options="popoverOptions"
      @command="handleMenuItemClick"
    >
      <el-check-tag class="type-combination-button" :checked="false">
        {{ group.k }} 个特性
        <el-icon class="el-icon--right">
          <ArrowDown />
        </el-icon>
      </el-check-tag>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-for="{ key, num, comb } in group.combs" :key :command="comb">
            <div class="type-item">
              <span>
                <template v-for="(id, i) in comb" :key="id">
                  <el-text v-if="i" type="info">&nbsp;&&nbsp;</el-text>
                  <el-text class="type-name" type="primary" tag="b">{{ typeList[id] }}</el-text>
                </template>
              </span>
              <el-tag class="type-item-num" type="success" size="small" round>{{ num }}</el-tag>
            </div>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue';
import { maxBy } from 'es-toolkit';
import { typeList } from '@/utils/data';
import type { Servant } from '@/utils/data';
import { generateCombinations } from '@/utils/math';

const { servants = [] } = defineProps<{
  servants?: Servant[];
}>();

const emit = defineEmits<{
  applyTypeFilter: [number[]];
}>();

const typesSets = computed(() => servants.map(s => new Set(s.types)));

const allTypes = computed(() => {
  const types = new Set<number>();
  servants.forEach(s => {
    s.types.forEach(t => types.add(t));
  });
  return Array.from(types).sort((a, b) => a - b);
});

const maxCombNum = computed(() =>
  Math.min(maxBy(servants, s => s.types.length)?.types.length ?? 0, allTypes.value.length),
);

interface TypeCombination {
  key: string;
  comb: number[];
  num: number;
}

interface TypeCombinationGroup {
  k: number;
  combs: TypeCombination[];
}

const typeCombinationGroups = computed((): TypeCombinationGroup[] => {
  if (!servants.length || maxCombNum.value < 2) return [];

  const result: TypeCombinationGroup[] = [];

  for (let k = 2; k <= maxCombNum.value; k++) {
    const combinations = generateCombinations(allTypes.value, k);
    const combs: TypeCombination[] = [];

    for (const comb of combinations) {
      const num = typesSets.value.filter(servantTypes =>
        comb.every(type => servantTypes.has(type)),
      ).length;

      if (num > 0) {
        combs.push({
          key: comb.join(','),
          comb,
          num,
        });
      }
    }

    combs.sort((a, b) => b.num - a.num);
    result.push({ k, combs });
  }

  return result;
});

const popoverOptions = {
  modifiers: [
    {
      name: 'offset',
      options: { offset: [0, 4] },
    },
  ],
};

const handleMenuItemClick = (comb: number[]) => {
  emit('applyTypeFilter', comb);
};
</script>

<style lang="scss" scoped>
.type-combination {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-combination-button {
  display: flex;
  align-items: center;
}

.type-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.type-item-num {
  margin-left: 16px;
}
</style>
