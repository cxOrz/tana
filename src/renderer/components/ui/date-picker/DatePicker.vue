<script setup lang="ts">
import { computed } from 'vue';
import { useVModel } from '@vueuse/core';
import { parseDate } from '@internationalized/date';
import { toDate } from 'reka-ui/date';
import type { DateValue } from 'reka-ui';
import Popover from '@/components/ui/popover/Popover.vue';
import PopoverTrigger from '@/components/ui/popover/PopoverTrigger.vue';
import PopoverContent from '@/components/ui/popover/PopoverContent.vue';
import { Calendar } from '@/components/ui/calendar';

type Props = {
  modelValue?: string;
  disabled?: boolean;
  placeholder?: string;
};

const props = defineProps<Props>();
const emits = defineEmits<{
  (e: 'update:modelValue', value?: string): void;
}>();

const model = useVModel(props, 'modelValue', emits);

/**
 * 将 YYYY-M-D 或 YYYY-MM-DD 格式的日期字符串转换为 Calendar 可用的日期对象。
 * @param {string | undefined} value - 日期字符串。
 * @returns {import('reka-ui').DateValue | undefined} 日期对象。
 */
const calendarValue = computed<DateValue | undefined>({
  get() {
    if (!model.value) return undefined;
    const parsed = toCalendarDate(model.value);
    return parsed ?? undefined;
  },
  set(value) {
    if (!value) {
      model.value = undefined;
      return;
    }
    const jsDate = toDate(value);
    model.value = buildDayStamp(jsDate);
  },
});

const formatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' });
const displayLabel = computed(() => {
  if (!model.value) return props.placeholder || '选择日期';
  const parsed = toCalendarDate(model.value);
  if (!parsed) return model.value;
  const jsDate = toDate(parsed);
  return formatter.format(jsDate);
});

/**
 * 将 YYYY-M-D / YYYY-MM-DD 转换为 CalendarDate。
 * @param {string} value - 日期字符串。
 * @returns {import('reka-ui').DateValue | null} 转换结果。
 */
function toCalendarDate(value: string) {
  const [y, m, d] = value.split('-').map((part) => Number(part));
  if (!y || !m || !d) return null;
  const padded = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  try {
    return parseDate(padded);
  } catch (error) {
    console.warn('[DatePicker] 无法解析日期', value, error);
    return null;
  }
}

/**
 * 生成 YYYY-M-D 格式的日期字符串。
 * @param {Date} date - JS 日期。
 * @returns {string} 日期戳。
 */
function buildDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
</script>

<template>
  <Popover>
    <PopoverTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </PopoverTrigger>
    <PopoverTrigger v-else as-child>
      <button
        type="button"
        :disabled="disabled"
        class="inline-flex items-center gap-2 rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span class="h-2 w-2 rounded-full bg-emerald-400" />
        <span>{{ displayLabel }}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      class="w-auto border border-white/10 bg-slate-900 text-slate-100 p-0 shadow-lg shadow-black/50"
    >
      <Calendar
        v-model="calendarValue"
        :disabled="disabled"
        class="rounded-lg bg-transparent text-slate-100"
      />
    </PopoverContent>
  </Popover>
</template>
