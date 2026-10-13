<template>
  <div class="quota-matrix">
    <el-button link type="primary" @click="reset">全部重置为 6</el-button>
    <p>其他职阶没有职阶礼装，由通用虚拟从者代表。每档最多 6 名。</p>
    <div class="quota-scroll" role="region" aria-label="虚拟从者配额表，可横向滚动" tabindex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">职阶</th>
            <th v-for="star in 5" :key="star" scope="col">★{{ star }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.name">
            <th scope="row">{{ row.name }}</th>
            <td v-for="star in 5" :key="star">
              <el-input-number
                :model-value="row.quota[star] ?? 6"
                :min="0"
                :max="6"
                :precision="0"
                size="small"
                controls-position="right"
                :aria-label="`${row.name} ★${star} 配额`"
                @update:model-value="row.quota[star] = $event ?? 6"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlannerInput } from '@/lib/auto-team';
import { classBonusList } from '@/utils/data';

const { input } = defineProps<{ input: PlannerInput }>();
const rows = computed(() => [
  ...classBonusList.map(name => ({ name, quota: input.quotaClass![name]! })),
  { name: '通用', quota: input.quotaGeneric! },
]);
const reset = () =>
  rows.value.forEach(row => {
    for (let star = 1; star <= 5; star++) row.quota[star] = 6;
  });
</script>

<style scoped lang="scss">
.quota-matrix {
  min-width: 0;
  width: 100%;
}
.quota-matrix p {
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.6;
  margin: 8px 0;
}
.quota-scroll {
  overflow-x: auto;
  padding: 3px;
}
table {
  border-collapse: collapse;
  width: 100%;
  max-width: 740px;
}
th,
td {
  padding: 6px;
  border-bottom: 1px solid var(--el-border-color);
  text-align: center;
  font-size: 12px;
}
th {
  background: var(--el-fill-color-light);
}
th:first-child {
  text-align: left;
}
.el-input-number {
  width: 88px;
}
</style>
