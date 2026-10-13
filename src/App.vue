<template>
  <div class="app-container">
    <header class="app-header">
      <nav class="mode-switch" aria-label="页面入口">
        <CheckTag
          :checked="!isTeam"
          :aria-current="!isTeam ? 'page' : undefined"
          @change="navigate('viewer')"
          >查看器</CheckTag
        >
        <CheckTag
          :checked="isTeam"
          :aria-current="isTeam ? 'page' : undefined"
          @change="navigate('team')"
          >自动配队</CheckTag
        >
      </nav>
      <el-button
        class="github-btn"
        :icon="IconGithub"
        aria-label="GitHub 仓库"
        circle
        text
        @click="gotoGithub"
      />
    </header>
    <KeepAlive>
      <component :is="isTeam ? AutoTeamPage : ViewerPage" />
    </KeepAlive>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import IconGithub from '@/assets/github.svg';
import CheckTag from '@/components/CheckTag.vue';
import ViewerPage from './pages/ViewerPage.vue';

const AutoTeamPage = defineAsyncComponent(() => import('./pages/AutoTeamPage.vue'));
const hash = ref(window.location.hash);
useEventListener(window, 'hashchange', () => {
  hash.value = window.location.hash;
});
const navigate = (page: 'team' | 'viewer') => {
  window.location.hash = page;
};
const isTeam = computed(() => hash.value === '#team');
const gotoGithub = () =>
  window.open(
    'https://github.com/Tsuk1ko/fgo-bond-craft-essence-calculator',
    '_blank',
    'noopener,noreferrer',
  );
</script>

<style scoped lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--el-text-color-primary);
}
.app-header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  padding: var(--page-y-padding) var(--page-x-padding) 8px;
}
.mode-switch {
  display: flex;
}
.mode-switch .el-check-tag:first-child {
  border-radius: 4px 0 0 4px;
  border-right: 1px solid var(--el-border-color);
}
.mode-switch .el-check-tag:last-child {
  border-radius: 0 4px 4px 0;
}
.github-btn {
  font-size: 18px;
}
</style>
