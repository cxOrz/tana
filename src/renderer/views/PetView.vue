<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useReminderBubbles } from '../hooks/useReminderBubbles';
import { usePixiPet } from '../hooks/usePixiPet';
import ReminderBubble from '../components/ReminderBubble.vue';
import { Button } from '@/components/ui/button';

/**
 * @file PetView.vue
 * @description
 * 宠物的主视图组件。
 * 负责协调 Pixi.js 动画和提醒气泡 UI 的显示。
 */

const pixiContainer = ref<HTMLDivElement | null>(null);
const rootEl = ref<HTMLDivElement | null>(null);
const isExiting = ref(false);
const isEntering = ref(false);

// 使用 hook 管理 Pixi.js 动画
const { uiScale } = usePixiPet(pixiContainer);

// 使用 hook 管理提醒气泡
const { activeReminder, activeModuleLabel, activeTime, isDev, dismissReminder, pushMockReminder } =
  useReminderBubbles();

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
    <div ref="pixiContainer" class="relative flex h-full w-full items-center justify-center">
      <!-- 提醒气泡 UI -->
      <div class="pointer-events-none absolute right-4 top-4">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          leave-active-class="transition duration-200 ease-in"
          enter-from-class="opacity-0 -translate-y-1.5"
          enter-to-class="opacity-100 translate-y-0"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1.5"
        >
          <ReminderBubble
            v-if="activeReminder"
            :reminder="activeReminder"
            :module-label="activeModuleLabel"
            :time="activeTime"
            :style="{
              transform: `scale(${uiScale})`,
              transformOrigin: 'top right',
              maxWidth: 'min(280px, 80vw)',
            }"
            @dismiss="dismissReminder"
          />
        </Transition>
      </div>

      <!-- 调试按钮 (仅开发模式) -->
      <Button
        v-if="isDev"
        variant="outline"
        class="cursor-pointer absolute bottom-4 right-4 flex items-center rounded-full border-0 px-4 py-2 text-[13px] font-semibold transition duration-200 ease-out backdrop-blur-sm no-drag"
        :style="{ transform: `scale(${uiScale})`, transformOrigin: 'bottom right' }"
        @click="pushMockReminder()"
      >
        调试提醒
      </Button>
    </div>
  </div>
</template>

<style lang="css">
html,
body {
  background-color: transparent;
}

/* 窗口淡入淡出过渡 */
.app-shell {
  opacity: 1;
  transition: opacity 220ms ease;
  -webkit-app-region: drag; /* 允许拖动窗口 */
}
.app-enter {
  opacity: 0;
}
.app-exit {
  opacity: 0;
}

.no-drag {
  -webkit-app-region: no-drag; /* 局部禁止拖动 */
}
</style>
