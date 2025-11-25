<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * @file JournalQuickInputView.vue
 * @description
 * 快速输入窗口，支持快捷键唤起后输入一段文本，回车提交并关闭。
 */

const content = ref('');
const tagsText = ref('');
const isSubmitting = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
let blurHandler: (() => void) | null = null;

const isDisabled = computed(() => isSubmitting.value || !content.value.trim());

const closeWindow = () => {
  window.close();
};

const autosize = () => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
};

const submit = async () => {
  if (isDisabled.value) return;
  isSubmitting.value = true;
  try {
    const tags = tagsText.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await window.electronAPI.addJournalEntry({
      body: content.value.trim(),
      tags: tags.length ? tags : undefined,
      source: 'quick-input',
    });
    content.value = '';
    tagsText.value = '';
    closeWindow();
  } catch (error) {
    console.error('[journal] 记录失败', error);
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  nextTick(() => {
    textareaRef.value?.focus();
    autosize();
  });
  blurHandler = () => closeWindow();
  window.addEventListener('blur', blurHandler);
});

onBeforeUnmount(() => {
  if (blurHandler) {
    window.removeEventListener('blur', blurHandler);
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-900/90 via-slate-900 to-slate-950 text-slate-50">
    <div class="mx-auto flex max-w-xl flex-col gap-4 px-6 py-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">快速记录</p>
          <p class="text-lg font-semibold text-white">写下此刻的想法</p>
        </div>
        <button
          class="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/20"
          type="button"
          @click="closeWindow"
        >
          ESC
        </button>
      </div>

      <div class="rounded-2xl bg-white/5 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
        <textarea
          ref="textareaRef"
          v-model="content"
          class="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/70 focus:bg-white/10 focus:shadow-[0_10px_40px_-25px_rgba(99,102,241,0.7)]"
          placeholder="输入内容，回车提交，Shift+Enter 换行"
          @keydown.enter.exact.prevent="submit"
          @keydown.enter.shift.exact.stop
          @keydown.esc.prevent="closeWindow"
          @input="autosize"
        />
        <div class="mt-3 flex items-center gap-3 text-[13px] text-slate-400">
          <input
            v-model="tagsText"
            class="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/70 focus:bg-white/10"
            placeholder="标签（逗号分隔，可选）"
            type="text"
          />
          <button
            class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/50"
            :disabled="isDisabled"
            type="button"
            @click="submit"
          >
            {{ isSubmitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>

      <p class="text-xs text-slate-500">提示：按回车提交，保存后窗口自动关闭。</p>
    </div>
  </div>
</template>
