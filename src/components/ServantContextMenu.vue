<template>
  <ContextMenu ref="contextMenuRef">
    <el-dropdown-item :icon="Compass" @click="handleGotoWiki">前往 WIKI</el-dropdown-item>
    <el-dropdown-item
      v-if="settings.hideServantMode && !settings.selectHideServantMode"
      :icon="Hide"
      @click="handleMenuClickHideServant"
      >隐藏该从者</el-dropdown-item
    >
  </ContextMenu>
</template>

<script setup lang="ts">
import { Compass, Hide } from '@element-plus/icons-vue';
import { isNil } from 'es-toolkit';
import { useSettingsStore } from '@/stores/settings';
import { servantMap } from '@/utils/data';
import ContextMenu from './ContextMenu.vue';

const settings = useSettingsStore();

const contextMenuRef = useTemplateRef('contextMenuRef');

let curContextMenuServantId: number | undefined;

const handleMenuClickHideServant = () => {
  if (isNil(curContextMenuServantId)) return;
  settings.hideServants.add(curContextMenuServantId);
};

const handleGotoWiki = () => {
  if (isNil(curContextMenuServantId)) return;
  window.open(`https://fgo.wiki/w/${servantMap[curContextMenuServantId]!.nameLink}`, '_blank');
};

const open = (event: MouseEvent, id: number) => {
  curContextMenuServantId = id;
  contextMenuRef.value?.open(event);
};

defineExpose({
  open,
});
</script>
