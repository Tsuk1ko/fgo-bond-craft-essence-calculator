import { onClickOutside, useEventListener } from '@vueuse/core';
import { onDeactivated, ref } from 'vue';

export const usePickerPopover = () => {
  const visible = ref(false);
  const trigger = ref<HTMLElement>();
  const content = ref<HTMLElement>();
  const close = () => {
    visible.value = false;
    trigger.value?.focus();
  };
  const focusContent = () =>
    content.value?.querySelector<HTMLElement>('button, [role="switch"], [tabindex="0"]')?.focus();
  onClickOutside(
    content,
    () => {
      visible.value = false;
    },
    { ignore: [trigger] },
  );
  useEventListener(window, 'keydown', event => {
    if (visible.value && event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  onDeactivated(() => {
    visible.value = false;
  });
  return { visible, trigger, content, close, focusContent };
};
