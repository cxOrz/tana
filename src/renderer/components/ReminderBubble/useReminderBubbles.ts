import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  readonly,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { ReminderPayload } from '@/../shared';

const isDev = import.meta.env.DEV;
const DISPLAY_DURATION_MS = 6000;
const DEV_GLOBAL_PUSH_MOCK_KEY = 'pushMockReminder';
const REMINDER_LABEL = '日常提醒';

export interface UseReminderBubblesResult {
  activeReminder: Readonly<Ref<ReminderPayload | null>>;
  activeLabel: Readonly<ComputedRef<string>>;
  activeTime: Readonly<ComputedRef<string>>;
  isDev: boolean;
  dismissReminder: () => void;
  pushMockReminder: () => void;
}

/**
 * 提供提醒队列与显示控制的逻辑。
 */
export function useReminderBubbles(): UseReminderBubblesResult {
  const reminderQueue = ref<ReminderPayload[]>([]);
  const internalActiveReminder = ref<ReminderPayload | null>(null);
  const activeReminder = readonly(internalActiveReminder);

  const activeLabel = computed(() => (internalActiveReminder.value ? REMINDER_LABEL : ''));

  const activeTime = computed(() => {
    const current = internalActiveReminder.value;
    if (!current) return '';
    const date = new Date(current.timestamp);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  });

  let reminderTimer: number | null = null;
  let unsubscribeReminder: (() => void) | null = null;

  const clearActiveReminder = () => {
    if (reminderTimer !== null) {
      window.clearTimeout(reminderTimer);
      reminderTimer = null;
    }
    internalActiveReminder.value = null;
  };

  /**
   * 安排一个自动关闭当前提醒的计时器。
   */
  function scheduleAutoDismiss(): void {
    reminderTimer = window.setTimeout(() => {
      dismissReminder();
    }, DISPLAY_DURATION_MS);
  }

  /**
   * 如果当前没有活动的提醒，则显示队列中的下一个提醒。
   */
  function showNextReminder(): void {
    if (internalActiveReminder.value) return;
    const next = reminderQueue.value.shift();
    if (!next) return;
    internalActiveReminder.value = next;
    scheduleAutoDismiss();
  }

  /**
   * 关闭当前活动的提醒，并尝试显示下一个。
   */
  function dismissReminder(): void {
    clearActiveReminder();
    showNextReminder();
  }

  /**
   * 将一个新的提醒推入队列。
   * @param {ReminderPayload} payload - 要推送的提醒。
   */
  const pushReminder = (payload: ReminderPayload) => {
    reminderQueue.value.push(payload);
    showNextReminder();
  };

  /**
   * 推送一个用于调试的模拟提醒。
   */
  const pushMockReminder = () => {
    const messageId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mock-${Date.now()}`;

    const payload: ReminderPayload = {
      messageId,
      text: `[调试] 这是一条 ${REMINDER_LABEL} 消息。`,
      timestamp: Date.now(),
      context: { mock: true },
    };

    pushReminder(payload);
    try {
      window.electronAPI?.notifySystem?.(payload);
    } catch {}
  };

  onMounted(() => {
    if (typeof window.electronAPI?.onReminder === 'function') {
      unsubscribeReminder = window.electronAPI.onReminder((payload) => {
        pushReminder(payload);
      });
    }

    if (isDev) {
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
    activeLabel,
    activeTime,
    isDev,
    dismissReminder,
    pushMockReminder,
  };
}
