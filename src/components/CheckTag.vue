<template>
  <el-check-tag
    :checked="checked"
    role="button"
    tabindex="0"
    :aria-pressed="checked"
    @change="change"
    @keydown.enter.prevent="change(!checked)"
    @keydown.space.prevent="change(!checked)"
    ><slot
  /></el-check-tag>
</template>

<script setup lang="ts">
const { checked = false } = defineProps<{ checked?: boolean }>();
const emit = defineEmits<{ 'update:checked': [value: boolean]; change: [value: boolean] }>();
const change = (value: boolean) => {
  emit('update:checked', value);
  emit('change', value);
};
</script>

<style scoped>
.el-check-tag {
  color: var(--el-text-color-regular);
}
.el-check-tag.is-checked {
  color: #225b96;
}
</style>
