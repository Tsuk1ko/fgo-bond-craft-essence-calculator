<template>
  <el-dropdown
    ref="dropdownRef"
    :virtual-ref="{
      getBoundingClientRect: () => position,
    }"
    :show-arrow="false"
    :popper-options="{
      modifiers: [{ name: 'offset', options: { offset: [0, 0] } }],
    }"
    virtual-triggering
    trigger="contextmenu"
    placement="bottom-start"
  >
    <template #dropdown>
      <el-dropdown-menu>
        <slot></slot>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
const dropdownRef = useTemplateRef('dropdownRef');

const position = ref({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
} as DOMRect);

const open = (event: MouseEvent) => {
  const { clientX, clientY } = event;
  position.value = DOMRect.fromRect({
    x: clientX,
    y: clientY,
  });
  event.preventDefault();
  dropdownRef.value?.handleOpen();
};

defineExpose({
  open,
});
</script>
