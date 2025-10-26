import { computed, onBeforeUnmount, onMounted, ref, readonly, type ComputedRef, type Ref } from 'vue';
import type { ReminderModuleKey, ReminderPayload } from '../../shared';

const moduleLabelMap: Record<ReminderModuleKey, string> = {
  progress: '专注提醒',
  income: '收益提示',
  wellness: '状态调节',
  surprise: '小惊喜'
};

const isDev = import.meta.env.DEV;
const DISPLAY_DURATION_MS = 6000;
const DEV_GLOBAL_PUSH_MOCK_KEY = 'pushMockReminder';

export interface UseReminderBubblesResult {
  activeReminder: Readonly<Ref<ReminderPayload | null>>;
  activeModuleLabel: Readonly<ComputedRef<string>>;
  activeTime: Readonly<ComputedRef<string>>;
  isDev: boolean;
  dismissReminder: () => void;
  pushMockReminder: (module?: ReminderModuleKey) => void;
}

/**
 * 提供提醒队列与展示的控制逻辑，封装订阅、调试等细节。
 * 注意：每次调用都会创建独立的提醒队列实例，方便测试与复用。
 */
export function useReminderBubbles(): UseReminderBubblesResult {
  const reminderQueue = ref<ReminderPayload[]>([]);
  const internalActiveReminder = ref<ReminderPayload | null>(null);
  const activeReminder = readonly(internalActiveReminder);

  const activeModuleLabel = computed(() => {
    const module = internalActiveReminder.value?.module;
    return module ? moduleLabelMap[module] ?? '提醒' : '';
  });

  const activeTime = computed(() => {
    const current = internalActiveReminder.value;
    if (!current) {
      return '';
    }
    const date = new Date(current.timestamp);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  });

  const mockModules: ReminderModuleKey[] = ['progress', 'income', 'wellness', 'surprise'];
  let mockIndex = 0;
  let reminderTimer: number | null = null;
  let unsubscribeReminder: (() => void) | null = null;

  const clearActiveReminder = () => {
    if (reminderTimer !== null) {
      window.clearTimeout(reminderTimer);
      reminderTimer = null;
    }
    internalActiveReminder.value = null;
  };

  function scheduleAutoDismiss(): void {
    reminderTimer = window.setTimeout(() => {
      dismissReminder();
    }, DISPLAY_DURATION_MS);
  }

  function showNextReminder(): void {
    if (internalActiveReminder.value) {
      return;
    }
    const next = reminderQueue.value.shift();
    if (!next) {
      return;
    }
    internalActiveReminder.value = next;
    scheduleAutoDismiss();
  }

  function dismissReminder(): void {
    clearActiveReminder();
    showNextReminder();
  }

  const pushReminder = (payload: ReminderPayload) => {
    reminderQueue.value.push(payload);
    showNextReminder();
  };

  const takeMockModule = (): ReminderModuleKey => {
    const index = mockIndex % mockModules.length;
    mockIndex += 1;
    return mockModules[index] ?? 'progress';
  };

  const pushMockReminder = (module?: ReminderModuleKey) => {
    const selectedModule = module ?? takeMockModule();
    const messageId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mock-${Date.now()}`;

    pushReminder({
      module: selectedModule,
      messageId,
      text: `[调试] 这是一条 ${moduleLabelMap[selectedModule]} 消息。`,
      timestamp: Date.now(),
      context: { mock: true }
    });
  };

  onMounted(() => {
    if (typeof window.electronAPI?.onReminder === 'function') {
      unsubscribeReminder = window.electronAPI.onReminder((payload) => {
        pushReminder(payload);
      });
    }

    if (isDev) {
      // 方便在 DevTools 中手动注入提醒。
      (window as unknown as Record<string, unknown>)[DEV_GLOBAL_PUSH_MOCK_KEY] = pushMockReminder;
    }
  });

  onBeforeUnmount(() => {
    clearActiveReminder();
    unsubscribeReminder?.();
    unsubscribeReminder = null;
    reminderQueue.value = [];
    if (isDev) {
      delete (window as unknown as Record<string, unknown>)[DEV_GLOBAL_PUSH_MOCK_KEY];
    }
  });

  return {
    activeReminder,
    activeModuleLabel,
    activeTime,
    isDev,
    dismissReminder,
    pushMockReminder
  };
}
