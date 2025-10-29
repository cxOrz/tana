<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { AnimatedSprite, Application, Assets } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { useReminderBubbles } from '../hooks/useReminderBubbles';
import { Button } from '@/components/ui/button';

const pixiContainer = ref<HTMLDivElement | null>(null);
const slimeSheetUrl = new URL('../assets/slime/slime.json', import.meta.url)
  .href;

let app: Application | null = null;
let disposed = false;

const {
  activeReminder,
  activeModuleLabel,
  activeTime,
  isDev,
  dismissReminder,
  pushMockReminder
} = useReminderBubbles();

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
  const instance = new Application();
  await instance.init({
    backgroundAlpha: 0,
    width: 450,
    height: 360
  });

  if (disposed || !pixiContainer.value) {
    instance.destroy();
    return;
  }

  pixiContainer.value.appendChild(instance.canvas);
  app = instance;
  instance.canvas.classList.add('w-full', 'h-full', 'block');

  const spritesheet = await Assets.load<Spritesheet>(slimeSheetUrl);

  if (disposed || !app) {
    return;
  }

  const frames = Object.entries(spritesheet.textures)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, texture]) => texture);

  const slime = new AnimatedSprite(frames);
  slime.anchor.set(0.5);
  slime.position.set(app.screen.width / 2, app.screen.height / 2);
  slime.animationSpeed = 0.03;
  slime.play();

  app.stage.addChild(slime);
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
    class="relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent"
    ref="pixiContainer"
  >
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
          class="pointer-events-auto min-w-[200px] max-w-60 rounded-[14px] border bg-slate-900/90 px-4 pt-3.5 pb-3 text-sm font-normal leading-relaxed text-slate-100 shadow-[0_16px_28px_rgba(15,23,42,0.28)] backdrop-blur"
          :class="bubbleBorderClass"
        >
          <div class="mb-1.5 flex items-center justify-between">
            <span class="font-semibold tracking-[0.4px]">
              {{ activeModuleLabel }}
            </span>
            <button
              type="button"
              class="flex h-[22px] w-[22px] items-center justify-center rounded-xl border-0 bg-slate-400/20 p-0 text-base leading-none text-slate-100 transition hover:bg-slate-400/35"
              @click="dismissReminder"
            >
              ×
            </button>
          </div>
          <div class="wrap-break-word text-slate-200/90">
            {{ activeReminder.text }}
          </div>
          <div
            v-if="activeTime"
            class="mt-2 text-right text-xs text-slate-200/60"
          >
            {{ activeTime }}
          </div>
        </div>
      </Transition>
    </div>

    <Button
      v-if="isDev"
      variant="outline"
      class="cursor-pointer absolute bottom-4 right-4 flex items-center rounded-full border-0 px-4 py-2 text-[13px] font-semibold transition duration-200 ease-out backdrop-blur-sm"
      @click="pushMockReminder()"
    >
      调试提醒
    </Button>
  </div>
</template>

<style lang="css" module>
body {
  background-color: transparent;
}
</style>
