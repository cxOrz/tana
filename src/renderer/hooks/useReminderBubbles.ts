import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  readonly,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { ReminderModuleKey, ReminderPayload } from '../../shared';

/**
 * @file useReminderBubbles.ts
 * @description
 * 负责管理和显示提醒气泡的 Vue Composition API hook。
 * 它包含一个提醒队列，并处理单个提醒的显示、自动隐藏和手动关闭逻辑。
 */

/**
 * 模块键到中文标签的映射。
 */
const moduleLabelMap: Record<ReminderModuleKey, string> = {
  progress: '专注提醒',
  income: '收益提示',
  wellness: '状态提醒',
  surprise: '小惊喜',
};

const isDev = import.meta.env.DEV;
const DISPLAY_DURATION_MS = 6000;
const DEV_GLOBAL_PUSH_MOCK_KEY = 'pushMockReminder';

/**
 * @interface UseReminderBubblesResult
 * @description `useReminderBubbles` hook 的返回值类型。
 * @property {Readonly<Ref<ReminderPayload | null>>} activeReminder - 当前活动的提醒，只读。
 * @property {Readonly<ComputedRef<string>>} activeModuleLabel - 当前活动提醒的模块标签，只读。
 * @property {Readonly<ComputedRef<string>>} activeTime - 当前活动提醒的显示时间，只读。
 * @property {boolean} isDev - 是否处于开发环境。
 * @property {() => void} dismissReminder - 关闭当前活动的提醒。
 * @property {(module?: ReminderModuleKey) => void} pushMockReminder - 推送一个用于调试的模拟提醒。
 */
export interface UseReminderBubblesResult {
  activeReminder: Readonly<Ref<ReminderPayload | null>>;
  activeModuleLabel: Readonly<ComputedRef<string>>;
  activeTime: Readonly<ComputedRef<string>>;
  isDev: boolean;
  dismissReminder: () => void;
  pushMockReminder: (module?: ReminderModuleKey) => void;
}

/**
 * 提供提醒队列与显示控制的逻辑。
 * @returns {UseReminderBubblesResult}
 */
export function useReminderBubbles(): UseReminderBubblesResult {
  const reminderQueue = ref<ReminderPayload[]>([]);
  const internalActiveReminder = ref<ReminderPayload | null>(null);
  const activeReminder = readonly(internalActiveReminder);

  const activeModuleLabel = computed(() => {
    const module = internalActiveReminder.value?.module;
    return module ? (moduleLabelMap[module] ?? '提醒') : '';
  });

  const activeTime = computed(() => {
    const current = internalActiveReminder.value;
    if (!current) return '';
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

  const takeMockModule = (): ReminderModuleKey => {
    const index = mockIndex % mockModules.length;
    mockIndex += 1;
    return mockModules[index] ?? 'progress';
  };

  /**
   * 推送一个用于调试的模拟提醒。
   * @param {ReminderModuleKey} [module] - 模拟提醒的模块类型。
   */
  const pushMockReminder = (module?: ReminderModuleKey) => {
    const selectedModule = module ?? takeMockModule();
    const messageId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `mock-${Date.now()}`;

    const payload: ReminderPayload = {
      module: selectedModule,
      messageId,
      text: `[调试] 这是一条 ${moduleLabelMap[selectedModule]} 消息。`,
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
    activeModuleLabel,
    activeTime,
    isDev,
    dismissReminder,
    pushMockReminder,
  };
}
