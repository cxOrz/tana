declare global {
  import type { ReminderPayload } from '../shared';
  import type {
    AddJournalEntryInput,
    JournalEntry,
    JournalDay,
    JournalSummary,
  } from '../shared/journalTypes';

  /**
   * @file types.d.ts
   * @description
   * 全局类型声明文件。
   * 用于扩展 `window` 对象和定义模块类型。
   */

  interface Window {
    /**
     * @property {object} electronAPI
     * @description 通过 preload 脚本暴露给渲染进程的 API。
     * 这是与主进程安全通信的接口。
     */
    electronAPI: {
      /**
       * 注册一个用于接收提醒事件的回调。
       * @param {(payload: ReminderPayload) => void} callback - 当收到提醒时调用的回调函数。
       * @returns {() => void} 一个用于取消监听的函数。
       */
      onReminder: (callback: (payload: ReminderPayload) => void) => () => void;

      /**
       * 注册一个在应用即将隐藏时触发的回调。
       * @param {() => void} callback - 回调函数。
       * @returns {() => void} 一个用于取消监听的函数。
       */
      onAppWillHide: (callback: () => void) => () => void;

      /**
       * 注册一个在应用即将显示时触发的回调。
       * @param {() => void} callback - 回调函数。
       * @returns {() => void} 一个用于取消监听的函数。
       */
      onAppWillShow: (callback: () => void) => () => void;

      /**
       * 通知主进程渲染器已经准备好隐藏。
       */
      notifyHideReady: () => void;

      /**
       * 请求主进程显示一个系统通知。
       * @param {ReminderPayload} payload - 提醒的数据负载。
       * @returns {Promise<void>}
       */
      notifySystem: (payload: ReminderPayload) => Promise<void>;

      /**
       * 写入一条日志记录。
       * @param {AddJournalEntryInput} input - 记录内容。
       * @returns {Promise<JournalEntry>}
       */
      addJournalEntry: (input: AddJournalEntryInput) => Promise<JournalEntry>;

      /**
       * 获取某天的日志数据。
       * @param {string} [dayStamp] - 日期。
       * @returns {Promise<JournalDay>}
       */
      getJournalDay: (dayStamp?: string) => Promise<JournalDay>;

      /**
       * 列出已有的日期。
       * @param {number} [limit] - 限制数量。
       * @returns {Promise<string[]>}
       */
      listJournalDays: (limit?: number) => Promise<string[]>;

      /**
       * 写入日报摘要。
       * @param {string} dayStamp - 日期。
       * @param {JournalSummary} summary - 摘要。
       * @returns {Promise<JournalSummary>}
       */
      setJournalSummary: (dayStamp: string, summary: JournalSummary) => Promise<JournalSummary>;

      /**
       * 请求主进程打开日报窗口。
       * @param {string} [dayStamp] - 日期。
       * @returns {Promise<void>}
       */
      openJournalReport: (dayStamp?: string) => Promise<void>;

      /**
       * 监听主进程发来的“打开日报”事件。
       * @param {(dayStamp?: string) => void} callback - 回调。
       * @returns {() => void} 取消函数。
       */
      onJournalOpenReport: (callback: (dayStamp?: string) => void) => () => void;
    };
  }
}

/**
 * 为 `.vue` 文件提供类型定义，以便 TypeScript 可以正确处理它们。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

export {};
