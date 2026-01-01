import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settings', () => {
  const selectedClasses = useLocalStorage<Set<string>>('selectedClasses', new Set());
  const selectedTypes = useLocalStorage<Set<number>>('selectedTypes', new Set());
  const selectedStars = useLocalStorage<Set<number>>('selectedStars', new Set());
  const selectHideServantMode = ref(false);
  const hideServantMode = useLocalStorage('hideServantMode', true);
  const hideServants = useLocalStorage<Set<number>>('hideServants', new Set());
  const minTypeNum = useLocalStorage<number>('minTypeNum', 1);
  const isOptionsFormCollapsed = useLocalStorage('isOptionsFormCollapsed', false);

  return {
    selectedClasses,
    selectedTypes,
    selectedStars,
    hideServantMode,
    selectHideServantMode,
    hideServants,
    minTypeNum,
    isOptionsFormCollapsed,
  };
});
