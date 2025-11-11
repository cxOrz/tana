<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { AnimatedSprite, Application, Assets, Spritesheet } from 'pixi.js';
import type { SpritesheetData, Texture } from 'pixi.js';
import { useReminderBubbles } from '../hooks/useReminderBubbles';
import { Button } from '@/components/ui/button';
import slimeSheetData from '../assets/slime/slime.json';
import slimeTextureUrl from '../assets/slime/slime.png';

const pixiContainer = ref<HTMLDivElement | null>(null);

let app: Application | null = null;
let disposed = false;
const rootEl = ref<HTMLDivElement | null>(null);
const isExiting = ref(false);
const isEntering = ref(false);
const uiScale = ref(1);

const loadSlimeSpritesheet = async (): Promise<Spritesheet> => {
  const texture = await Assets.load<Texture>(slimeTextureUrl);
  const sheet = new Spritesheet(texture, slimeSheetData as SpritesheetData);
  await sheet.parse();
  return sheet;
};

const { activeReminder, activeModuleLabel, activeTime, isDev, dismissReminder, pushMockReminder } =
  useReminderBubbles();

const bubbleBorderClass = computed(() => {
  const module = activeReminder.value?.module;
  switch (module) {
    case 'progress':
      return 'border-emerald-500/40';
    case 'income':
      return 'border-blue-500/40';
    case 'wellness':
      return 'border-orange-500/40';
    case 'surprise':
      return 'border-pink-500/40';
    default:
      return '';
  }
});

onMounted(async () => {
  // 显示：先置入 enter，再下一帧移除以触发过渡
  const offShow = window.electronAPI.onAppWillShow(() => {
    isExiting.value = false;
    isEntering.value = true;
    requestAnimationFrame(() => {
      isEntering.value = false;
    });
  });

  // 隐藏：置 exit，等待过渡完成后回执
  const offHide = window.electronAPI.onAppWillHide(() => {
    isExiting.value = true;
    const el = rootEl.value;
    const onEnd = () => {
      window.electronAPI.notifyHideReady();
    };
    el?.addEventListener('transitionend', onEnd as any, { once: true });
  });
  const instance = new Application();
  await instance.init({
    backgroundAlpha: 0,
    // Auto-resize canvas to the window size
    resizeTo: window as any,
  });

  if (disposed || !pixiContainer.value) {
    instance.destroy();
    return;
  }

  pixiContainer.value.appendChild(instance.canvas);
  app = instance;
  instance.canvas.classList.add('w-full', 'h-full', 'block');

  const spritesheet = await loadSlimeSpritesheet();

  if (disposed || !app) {
    return;
  }

  const frames = Object.entries(spritesheet.textures)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, texture]) => texture);

  const slime = new AnimatedSprite(frames);
  slime.anchor.set(0.5);
  // Base logical size for scale computation (matches main BASE_WINDOW)
  const BASE_WIDTH = 450;
  const BASE_HEIGHT = 360;
  // center and scale to current screen size
  const applyLayout = () => {
    if (!app) return;
    const scaleX = app.screen.width / BASE_WIDTH;
    const scaleY = app.screen.height / BASE_HEIGHT;
    const uniform = Math.min(scaleX, scaleY);
    slime.scale.set(uniform);
    slime.position.set(app.screen.width / 2, app.screen.height / 2);
    // UI bubble scales down on small windows to avoid covering the scene
    uiScale.value = Math.min(1, Math.max(0.7, uniform));
  };
  applyLayout();
  slime.animationSpeed = 0.03;
  slime.play();

  app.stage.addChild(slime);

  // Keep slime centered on window resize
  const onResize = () => applyLayout();
  // Use window resize which tracks BrowserWindow content size changes
  window.addEventListener('resize', onResize);

  // cleanup listeners when unmount
  onBeforeUnmount(() => {
    offShow?.();
    offHide?.();
    window.removeEventListener('resize', onResize);
  });
});

onBeforeUnmount(() => {
  disposed = true;

  if (app) {
    const view = app.canvas;
    if (view.parentNode) {
      view.parentNode.removeChild(view);
    }
    app.destroy();
    app = null;
  }
});
</script>

<template>
  <div
    ref="rootEl"
    class="app-shell relative h-full w-full overflow-hidden bg-transparent"
    :class="{ 'app-enter': isEntering, 'app-exit': isExiting }"
  >
    <div ref="pixiContainer" class="relative flex h-full w-full items-center justify-center">
      <div class="pointer-events-none absolute right-4 top-4">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          leave-active-class="transition duration-200 ease-in"
          enter-from-class="opacity-0 -translate-y-1.5"
          enter-to-class="opacity-100 translate-y-0"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1.5"
        >
          <div
            v-if="activeReminder"
            :key="activeReminder.messageId"
            class="pointer-events-auto min-w-[160px] max-w-60 rounded-[14px] border bg-slate-900/90 px-4 pt-3.5 pb-3 text-sm font-normal leading-relaxed text-slate-100 shadow-[0_16px_28px_rgba(15,23,42,0.28)] backdrop-blur no-drag"
            :style="{
              transform: `scale(${uiScale})`,
              transformOrigin: 'top right',
              maxWidth: 'min(280px, 80vw)',
            }"
            :class="bubbleBorderClass"
          >
            <div class="mb-1.5 flex items-center justify-between">
              <span class="font-semibold tracking-[0.4px]">
                {{ activeModuleLabel }}
              </span>
              <button
                type="button"
                class="flex h-[22px] w-[22px] items-center justify-center rounded-xl border-0 bg-slate-400/20 p-0 text-base leading-none text-slate-100 transition hover:bg-slate-400/35 no-drag"
                @click="dismissReminder"
              >
                ×
              </button>
            </div>
            <div class="wrap-break-word text-slate-200/90">
              {{ activeReminder.text }}
            </div>
            <div v-if="activeTime" class="mt-2 text-right text-xs text-slate-200/60">
              {{ activeTime }}
            </div>
          </div>
        </Transition>
      </div>

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

/* window fade transitions */
.app-shell {
  opacity: 1;
  transition: opacity 220ms ease;
  -webkit-app-region: drag;
}
.app-enter {
  opacity: 0;
}
.app-exit {
  opacity: 0;
}

.no-drag {
  -webkit-app-region: no-drag;
}
</style>
