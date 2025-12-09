<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import DatePicker from '@/components/ui/date-picker/DatePicker.vue';
import type { JournalDay } from '../../shared/journalTypes';

const route = useRoute();
const buildDayStamp = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const activeDay = ref<string>(route.query.date?.toString() || buildDayStamp(new Date()));
const dayData = ref<JournalDay | null>(null);
const isLoading = ref(false);
const errorMsg = ref('');
let offOpenReport: (() => void) | null = null;

const entries = computed(() => dayData.value?.entries ?? []);
const isEmpty = computed(() => entries.value.length === 0);
const summaryContent = computed(() => dayData.value?.summary?.draft?.trim() || '还没有到时间哦~');
const summaryHtml = computed<string>(() => {
  const rawHtml = marked.parse(summaryContent.value) as string;
  return DOMPurify.sanitize(rawHtml);
});

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const loadDay = async (dayStamp?: string) => {
  isLoading.value = true;
  errorMsg.value = '';
  const targetDay = dayStamp || activeDay.value || buildDayStamp(new Date());
  try {
    const data = await window.electronAPI.getJournalDay(targetDay);
    dayData.value = data;
    activeDay.value = targetDay;
  } catch (error) {
    errorMsg.value = '加载失败，请稍后重试';
    console.error('[journal] 加载失败', error);
  } finally {
    isLoading.value = false;
  }
};

const formatTime = (ts: number) => timeFormatter.format(ts);

onMounted(() => {
  loadDay(activeDay.value);
  offOpenReport = window.electronAPI.onJournalOpenReport((dayStamp) => loadDay(dayStamp));
});

onBeforeUnmount(() => {
  offOpenReport?.();
});

watch(
  () => route.query.date,
  (newDate) => {
    if (newDate) {
      loadDay(newDate.toString());
    }
  }
);
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <div class="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-500">今日摘要</p>
          <h1 class="flex items-center gap-2 text-2xl font-semibold text-white">
            <span>日志 ·</span>
            <DatePicker
              :model-value="activeDay"
              :disabled="isLoading"
              @update:modelValue="(val) => val && loadDay(val)"
            >
              <template #trigger>
                <button
                  type="button"
                  class="rounded-none border-0 border-b border-transparent px-2 py-1 text-left font-semibold text-white transition hover:border-b-white/70 hover:bg-transparent focus-visible:border-b-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isLoading"
                >
                  {{ activeDay }}
                </button>
              </template>
            </DatePicker>
          </h1>
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-400">
          <span class="rounded-full bg-white/5 px-3 py-2">快捷键：Alt+J 追加记录</span>
          <button
            class="rounded-md border border-white/15 bg-transparent px-3 py-2 font-medium text-slate-100 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            @click="loadDay()"
          >
            刷新
          </button>
        </div>
      </header>

      <section class="grid gap-4 lg:grid-cols-3 lg:items-start">
        <aside class="rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ring-white/10">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">回顾今日</h2>
            <span class="text-xs text-slate-400">
              {{ dayData?.summary?.generatedAt ? '已生成' : '未生成' }}
            </span>
          </div>
          <div
            class="mt-3 rounded-xl border border-white/5 bg-white/5 px-3 py-3 text-sm text-slate-100"
          >
            <div class="markdown-preview space-y-2 leading-6 text-slate-100" v-html="summaryHtml" />
          </div>
        </aside>

        <div class="rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ring-white/10 lg:col-span-2">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">记录列表</h2>
            <span class="text-xs text-slate-400"> {{ entries.length || 0 }} 条 </span>
          </div>
          <div class="mt-3 space-y-3">
            <p v-if="isLoading" class="text-sm text-slate-400">加载中...</p>
            <p v-else-if="errorMsg" class="text-sm text-red-300">{{ errorMsg }}</p>
            <div
              v-else-if="isEmpty"
              class="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300 shadow-sm shadow-black/20"
            >
              <p class="font-medium text-slate-100">今天还没有记录</p>
              <p class="mt-1 text-slate-400">按 Alt+J 打开快速输入，写下第一条想法。</p>
            </div>
            <div
              v-for="item in entries"
              v-else
              :key="item.id"
              class="rounded-xl border border-white/5 bg-white/5 px-4 py-3 shadow-sm shadow-black/20"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="text-xs text-indigo-200">{{ formatTime(item.ts) }}</div>
                <div
                  class="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400"
                >
                  <span
                    v-for="tag in item.tags || []"
                    :key="tag"
                    class="rounded-full bg-white/10 px-2 py-1"
                  >
                    {{ tag }}
                  </span>
                  <span v-if="item.source" class="rounded-full bg-white/5 px-2 py-1">
                    {{ item.source }}
                  </span>
                </div>
              </div>
              <p v-if="item.title" class="mt-1 text-sm font-semibold text-white">
                {{ item.title }}
              </p>
              <p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                {{ item.body }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
:deep(.markdown-preview h2) {
  color: #e2e8f0;
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0.75rem 0 0.35rem;
}

:deep(.markdown-preview p) {
  color: #cbd5e1;
  line-height: 1.7;
  margin: 0 0 0.6rem;
}

:deep(.markdown-preview ul) {
  margin: 0 0 0.6rem;
  padding-left: 1.1rem;
  list-style: disc;
}
</style>
