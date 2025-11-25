<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { JournalDay } from '../../shared/journalTypes';

/**
 * @file JournalReportView.vue
 * @description
 * 日报窗口，展示当天的记录与 Markdown 摘要。
 */

const route = useRoute();
const buildDayStamp = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const activeDay = ref<string>(route.query.date?.toString() || buildDayStamp(new Date()));
const dayData = ref<JournalDay | null>(null);
const isLoading = ref(false);
const errorMsg = ref('');
let offOpenReport: (() => void) | null = null;

const summaryText = computed(() => dayData.value?.summary?.draft?.trim() || '');
const displaySummary = computed(() => {
  const fromSummary = summaryText.value;
  if (fromSummary) return fromSummary;
  const entries = dayData.value?.entries ?? [];
  if (entries.length === 0) {
    return '暂无记录。\n\n提示：按 Alt+J 打开快速记录，18:00 会推送日报提醒。';
  }
  const items = entries.map((item) => `- ${item.body?.slice(0, 80) || '（空内容）'}`);
  return ['# 今日记录摘要', ...items].join('\n');
});

const isEmpty = computed(() => (dayData.value?.entries?.length ?? 0) === 0);

const loadDay = async (dayStamp: string) => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const data = await window.electronAPI.getJournalDay(dayStamp);
    dayData.value = data;
    activeDay.value = dayStamp;
  } catch (error) {
    errorMsg.value = '加载失败，请稍后重试';
    console.error('[journal] 加载失败', error);
  } finally {
    isLoading.value = false;
  }
};

const handleOpenReport = (dayStamp?: string) => {
  const target = dayStamp || buildDayStamp(new Date());
  loadDay(target);
};

const formatTime = (ts: number) => {
  const date = new Date(ts);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

onMounted(() => {
  loadDay(activeDay.value);
  offOpenReport = window.electronAPI.onJournalOpenReport((dayStamp) => handleOpenReport(dayStamp));
});

onBeforeUnmount(() => {
  offOpenReport?.();
});

watch(
  () => route.query.date,
  (newDate) => {
    if (newDate) {
      handleOpenReport(newDate.toString());
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
          <h1 class="text-2xl font-semibold text-white">日志 · {{ activeDay }}</h1>
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-400">
          <button
            class="rounded-lg bg-white/10 px-3 py-2 font-medium text-slate-100 shadow-inner shadow-white/10 transition hover:bg-white/20"
            type="button"
            @click="handleOpenReport()"
          >
            刷新
          </button>
          <span class="rounded-full bg-white/5 px-3 py-2">快捷键：Alt+J 追加记录</span>
        </div>
      </header>

      <section class="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div class="rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ring-white/10 lg:col-span-2">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">记录列表</h2>
            <span class="text-xs text-slate-400">
              {{ dayData?.entries?.length || 0 }} 条
            </span>
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
              v-for="item in dayData?.entries"
              v-else
              :key="item.id"
              class="rounded-xl border border-white/5 bg-white/5 px-4 py-3 shadow-sm shadow-black/20"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="text-xs text-indigo-200">{{ formatTime(item.ts) }}</div>
                <div class="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-slate-400">
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

        <aside class="rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ring-white/10">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-white">Markdown 摘要</h2>
            <span class="text-xs text-slate-400">
              {{ dayData?.summary?.generatedAt ? '已生成' : '未生成' }}
            </span>
          </div>
          <div class="mt-3 rounded-xl border border-white/5 bg-slate-900/60 px-3 py-3 text-sm text-slate-100 shadow-inner shadow-black/30">
            <pre class="whitespace-pre-wrap leading-6 text-slate-100">{{ displaySummary }}</pre>
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>
