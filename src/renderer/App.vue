<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { AnimatedSprite, Application, Assets } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { useReminderBubbles } from './composables/useReminderBubbles';

const pixiContainer = ref<HTMLDivElement | null>(null);
const slimeSheetUrl = new URL('./assets/slime/slime.json', import.meta.url).href;

let app: Application | null = null;
let disposed = false;

// 负责提醒队列与调试入口，便于与 PIXI 逻辑分离维护。
const { activeReminder, activeModuleLabel, activeTime, isDev, dismissReminder, pushMockReminder } =
  useReminderBubbles();

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
  <div class="app-root" ref="pixiContainer">
    <div class="bubble-layer">
      <Transition name="bubble-fade">
        <div
          v-if="activeReminder"
          :key="activeReminder.messageId"
          class="bubble"
          :class="`bubble--${activeReminder.module}`"
        >
          <div class="bubble__header">
            <span class="bubble__title">{{ activeModuleLabel }}</span>
            <button type="button" class="bubble__close" @click="dismissReminder">×</button>
          </div>
          <div class="bubble__text">{{ activeReminder.text }}</div>
          <div v-if="activeTime" class="bubble__footer">{{ activeTime }}</div>
        </div>
      </Transition>
    </div>
    <button
      v-if="isDev"
      type="button"
      class="debug-button"
      @click="pushMockReminder()"
    >
      调试提醒
    </button>
  </div>
</template>

<style scoped>
.app-root {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
  position: relative;
}

.app-root canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.bubble-layer {
  position: absolute;
  top: 16px;
  right: 16px;
  pointer-events: none;
}

.bubble {
  pointer-events: auto;
  min-width: 200px;
  max-width: 240px;
  padding: 14px 16px 12px;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.92);
  color: #f8fafc;
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.28);
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-size: 14px;
  line-height: 1.5;
}

.bubble__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.bubble__title {
  font-weight: 600;
  letter-spacing: 0.4px;
}

.bubble__close {
  border: none;
  width: 22px;
  height: 22px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.2);
  color: #f8fafc;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.bubble__close:hover {
  background: rgba(148, 163, 184, 0.35);
}

.bubble__text {
  margin: 0;
  word-break: break-word;
  color: rgba(226, 232, 240, 0.92);
}

.bubble__footer {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.62);
  text-align: right;
}

.bubble--progress {
  border-color: rgba(34, 197, 94, 0.4);
}

.bubble--income {
  border-color: rgba(59, 130, 246, 0.4);
}

.bubble--wellness {
  border-color: rgba(249, 115, 22, 0.4);
}

.bubble--surprise {
  border-color: rgba(236, 72, 153, 0.4);
}

.bubble-fade-enter-active,
.bubble-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.bubble-fade-enter-from,
.bubble-fade-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.debug-button {
  position: absolute;
  bottom: 16px;
  right: 16px;
  padding: 6px 12px;
  border: none;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.85);
  color: #f8fafc;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 10px 18px rgba(59, 130, 246, 0.28);
  transition: background 0.2s ease;
}

.debug-button:hover {
  background: rgba(37, 99, 235, 0.95);
}
</style>
