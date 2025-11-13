<script setup lang="ts">
import { computed } from 'vue';
import type { ReminderPayload } from '../../shared';

/**
 * @file ReminderBubble.vue
 * @description
 * 一个独立的 UI 组件，用于显示提醒气泡。
 */

const props = defineProps<{
  reminder: ReminderPayload;
  moduleLabel: string;
  time: string;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();

const bubbleBorderClass = computed(() => {
  const module = props.reminder.module;
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
</script>

<template>
  <div
    :key="reminder.messageId"
    class="pointer-events-auto min-w-[160px] max-w-60 rounded-[14px] border bg-slate-900/90 px-4 pt-3.5 pb-3 text-sm font-normal leading-relaxed text-slate-100 shadow-[0_16px_28px_rgba(15,23,42,0.28)] backdrop-blur no-drag"
    :class="bubbleBorderClass"
  >
    <div class="mb-1.5 flex items-center justify-between">
      <span class="font-semibold tracking-[0.4px]">
        {{ moduleLabel }}
      </span>
      <button
        type="button"
        class="flex h-[22px] w-[22px] items-center justify-center rounded-xl border-0 bg-slate-400/20 p-0 text-base leading-none text-slate-100 transition hover:bg-slate-400/35 no-drag"
        @click="emit('dismiss')"
      >
        ×
      </button>
    </div>
    <div class="wrap-break-word text-slate-200/90">
      {{ reminder.text }}
    </div>
    <div v-if="time" class="mt-2 text-right text-xs text-slate-200/60">
      {{ time }}
    </div>
  </div>
</template>
