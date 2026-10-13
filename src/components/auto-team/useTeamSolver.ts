import { releaseProxy, wrap } from 'comlink';
import { ElMessage } from 'element-plus';
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue';
import type { ComputedRef } from 'vue';
import type { PlannerInput, PlannerResult } from '@/lib/auto-team';
import type { PlannerWorker } from '@/lib/auto-team/worker';

export const useTeamSolver = (input: ComputedRef<PlannerInput>) => {
  const calculating = ref(false);
  const result = shallowRef<PlannerResult>();
  const resultInput = shallowRef<PlannerInput>();
  const fingerprint = computed(() => JSON.stringify(input.value));
  const resultFingerprint = ref('');
  const stale = computed(
    () => Boolean(result.value) && resultFingerprint.value !== fingerprint.value,
  );
  let worker: Worker | undefined;
  let disposed = false;
  onBeforeUnmount(() => {
    disposed = true;
    worker?.terminate();
  });

  const start = async () => {
    if (calculating.value) return;
    calculating.value = true;
    const submittedFingerprint = fingerprint.value;
    const snapshot: PlannerInput = JSON.parse(submittedFingerprint);
    let release: (() => void) | undefined;
    try {
      worker = new Worker(new URL('../../lib/auto-team/worker.ts', import.meta.url), {
        type: 'module',
      });
      const api = wrap<PlannerWorker>(worker);
      release = () => api[releaseProxy]();
      const failed = new Promise<never>((_, reject) => {
        worker!.addEventListener(
          'error',
          () => reject(new Error('配队计算加载失败，请重试或刷新页面')),
          { once: true },
        );
        worker!.addEventListener(
          'messageerror',
          () => reject(new Error('配队结果读取失败，请重试')),
          { once: true },
        );
      });
      const next = await Promise.race([api.solve(snapshot), failed]);
      if (disposed) return;
      result.value = next;
      resultInput.value = snapshot;
      resultFingerprint.value = submittedFingerprint;
    } catch (error) {
      if (!disposed)
        ElMessage.error(
          error instanceof Error
            ? error.message.replace(/^auto-team:\s*/, '')
            : '配队失败，请检查条件后重试',
        );
    } finally {
      release?.();
      worker?.terminate();
      worker = undefined;
      calculating.value = false;
    }
  };
  return { calculating, result, resultInput, stale, start };
};
