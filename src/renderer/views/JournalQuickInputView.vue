<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * @file JournalQuickInputView.vue
 * @description
 * 快速输入窗口，支持快捷键唤起后输入一段文本，回车提交并关闭。
 */

const content = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const closeWindow = () => {
  window.close();
};

const submit = async () => {
  const trimmedContent = content.value.trim();
  if (!trimmedContent) return;

  try {
    await window.electronAPI.addJournalEntry({
      body: trimmedContent,
      source: 'quick-input',
    });
    content.value = '';
    closeWindow();
  } catch (error) {
    console.error('[journal] 记录失败', error);
  }
};

const handleGlobalEsc = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeWindow();
  }
};

onMounted(() => {
  nextTick(() => {
    textareaRef.value?.focus();
  });
  window.addEventListener('keydown', handleGlobalEsc);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalEsc);
});

</script>

<template>
  <div class="h-screen overflow-hidden rounded-[10px] bg-linear-to-b from-slate-900/90 via-slate-900 to-slate-950 text-slate-50">
    <div class="mx-auto flex h-full max-w-xl flex-col gap-4 px-6 py-6">
      <div class="flex shrink-0 items-center justify-between">
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

        <textarea
          ref="textareaRef"
          v-model="content"
          class="flex-grow w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur text-sm leading-6 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-indigo-400/70 focus:bg-white/10 focus:shadow-[0_10px_40px_-25px_rgba(99,102,241,0.7)]"
          placeholder="输入内容，回车提交，Shift+Enter 换行"
          @keydown.enter.exact.prevent="submit"
          @keydown.enter.shift.exact.stop
        />

    </div>
  </div>
</template>
