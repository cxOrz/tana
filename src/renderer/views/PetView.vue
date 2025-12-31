<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { usePixiPet } from '../hooks/usePixiPet';

const pixiContainer = ref<HTMLDivElement | null>(null);
const rootEl = ref<HTMLDivElement | null>(null);
const isExiting = ref(false);
const isEntering = ref(false);

// 使用 hook 管理 Pixi.js 动画
usePixiPet(pixiContainer);

onMounted(() => {
  // 监听主进程的窗口显示/隐藏事件
  const offShow = window.electronAPI.onAppWillShow(() => {
    isExiting.value = false;
    isEntering.value = true;
    requestAnimationFrame(() => {
      isEntering.value = false;
    });
  });

  const offHide = window.electronAPI.onAppWillHide(() => {
    isExiting.value = true;
    const el = rootEl.value;
    const onEnd = (event: TransitionEvent) => {
      if (event.target === el) {
        window.electronAPI.notifyHideReady();
      }
    };
    el?.addEventListener('transitionend', onEnd, { once: true });
  });

  onBeforeUnmount(() => {
    offShow?.();
    offHide?.();
  });
});
</script>

<template>
  <div
    ref="rootEl"
    class="app-shell relative h-full w-full overflow-hidden bg-transparent"
    :class="{ 'app-enter': isEntering, 'app-exit': isExiting }"
  >
    <div ref="pixiContainer" class="relative flex h-full w-full items-center justify-center" />
    <div class="drag-strip" />
  </div>
</template>

<style lang="css">
/* 窗口淡入淡出过渡 */
.app-shell {
  opacity: 1;
  transition: opacity 220ms ease;
  border-radius: 10px;
}

.app-enter {
  opacity: 0;
}

.app-exit {
  opacity: 0;
}

/* 仅底部 20px 区域可拖动 */
.drag-strip {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  inset-block-end: 0;
  -webkit-app-region: drag;
}
</style>
