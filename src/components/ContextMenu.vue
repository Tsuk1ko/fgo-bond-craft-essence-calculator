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

const position = shallowRef(DOMRect.fromRect());

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
