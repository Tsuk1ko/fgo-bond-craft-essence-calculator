import { groupBy, maxBy } from 'es-toolkit';
import { defineStore } from 'pinia';
import type { ServantForDisplay, ServantGroupForDisplay } from '@/types';
import { classSortIndex, servantList, typeList } from '@/utils/data';
import type { Servant } from '@/utils/data';
import { useSettingsStore } from './settings';

export const useServantStore = defineStore('servant', () => {
  const settings = useSettingsStore();

  const filteredServantsWithoutTypes = computed<Servant[]>(() =>
    servantList.filter(s => {
      if (!settings.selectHideServantMode && settings.hideServants.has(s.id)) return false;
      if (settings.selectedClasses.size && !settings.selectedClasses.has(s.class)) return false;
      if (settings.selectedStars.size && !settings.selectedStars.has(s.star)) return false;
      return true;
    }),
  );

  const filteredServants = computed<Servant[]>(() =>
    filteredServantsWithoutTypes.value.filter(
      s => !settings.selectedTypes.size || s.types.some(t => settings.selectedTypes.has(t)),
    ),
  );

  const filteredServantsForDisplay = computed<ServantForDisplay[]>(() =>
    filteredServants.value.map(s => {
      const hasSelectedTypes = Boolean(settings.selectedTypes.size);
      const selected = hasSelectedTypes
        ? s.types.filter(t => settings.selectedTypes.has(t))
        : s.types;
      const { firstTypeTooltip = [], secondTypeTooltip = [] } = groupBy(
        s.types.map(i => ({
          text: typeList[i]!,
          comment: s.typeComments?.[i],
          disabled: hasSelectedTypes ? !settings.selectedTypes.has(i) : false,
        })),
        item => (item.disabled ? 'secondTypeTooltip' : 'firstTypeTooltip'),
      );
      return {
        ...s,
        selectedTypes: selected,
        hasTypeComment: s.typeComments && selected.some(i => i in s.typeComments!),
        typeTooltip: [...firstTypeTooltip, ...secondTypeTooltip],
      };
    }),
  );

  const maxTypeNum = computed(
    () =>
      maxBy(filteredServantsForDisplay.value, s => s.selectedTypes.length)?.selectedTypes.length ??
      0,
  );

  const filteredServantsForDisplayWithMinTypeNum = computed<ServantForDisplay[]>(() => {
    const minVal = Math.min(settings.minTypeNum, maxTypeNum.value);
    return filteredServantsForDisplay.value.filter(s => s.selectedTypes.length >= minVal);
  });

  const servantGroupsForDisplay = computed<ServantGroupForDisplay[]>(() => {
    const groups = Object.entries(
      groupBy(filteredServantsForDisplayWithMinTypeNum.value, s => s.class),
    );
    groups.sort(([a], [b]) => classSortIndex[a]! - classSortIndex[b]!);
    groups.forEach(([, servants]) => {
      servants.sort((a, b) =>
        a.selectedTypes.length === b.selectedTypes.length
          ? b.star - a.star
          : b.selectedTypes.length - a.selectedTypes.length,
      );
    });
    return groups;
  });

  return {
    filteredServantsWithoutTypes,
    filteredServantsForDisplayWithMinTypeNum,
    servantGroupsForDisplay,
  };
});
