<script setup lang="ts">
import { computed } from 'vue';
import { useReminderBubbles } from './useReminderBubbles';
import { Button } from '@/components/ui/button';

const props = defineProps<{
  uiScale: number;
}>();

const { activeReminder, activeLabel, activeTime, isDev, dismissReminder, pushMockReminder } =
  useReminderBubbles();

const bubbleBorderClass = computed(() => {
  return activeReminder.value ? 'border-indigo-500/40' : '';
});
</script>

<template>
  <div class="pointer-events-none absolute inset-0">
    <div class="absolute right-4 top-4">
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
          class="pointer-events-auto min-w-40 max-w-60 rounded-[14px] border bg-slate-900/90 px-4 pt-3.5 pb-3 text-sm font-normal leading-relaxed text-slate-100 shadow-[0_16px_28px_rgba(15,23,42,0.28)] backdrop-blur no-drag"
          :class="bubbleBorderClass"
          :style="{
            transform: `scale(${props.uiScale})`,
            transformOrigin: 'top right',
            maxWidth: 'min(280px, 80vw)',
          }"
        >
          <div class="mb-1.5 flex items-center justify-between">
            <span class="font-semibold tracking-[0.4px]">
              {{ activeLabel }}
            </span>
            <button
              type="button"
              class="flex h-[22px] w-[22px] items-center justify-center rounded-xl border-0 bg-slate-400/20 p-0 text-base leading-none text-slate-100 transition hover:bg-slate-400/35 no-drag"
              @click="dismissReminder"
            >
              x
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

    <div class="absolute right-4 bottom-4">
      <Button
        v-if="isDev"
        variant="outline"
        class="pointer-events-auto cursor-pointer flex items-center rounded-full border-0 px-4 py-2 text-[13px] font-semibold transition duration-200 ease-out backdrop-blur-sm no-drag"
        :style="{ transform: `scale(${props.uiScale})`, transformOrigin: 'bottom right' }"
        @click="pushMockReminder()"
      >
        调试提醒
      </Button>
    </div>
  </div>
</template>
