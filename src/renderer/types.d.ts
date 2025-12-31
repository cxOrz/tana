import type {
  AddJournalEntryInput,
  JournalEntry,
  JournalDay,
  JournalSummary,
} from '../shared/journalTypes';
import type { AppConfig } from '../shared/configTypes';

/**
 * @file types.d.ts
 * @description
 * 全局类型声明文件。
 * 用于扩展 `window` 对象和定义模块类型。
 */

declare global {
  interface Window {
    /**
     * @property {object} electronAPI
     * @description 通过 preload 脚本暴露给渲染进程的 API。
     * 这是与主进程安全通信的接口。
     */
    electronAPI: {
      /**
       * 获取应用配置。
       * @returns {Promise<AppConfig>}
       */
      getAppConfig: () => Promise<AppConfig>;

      /**
       * 读取资源。
       * @param {string} path
       * @returns {Promise<string>}
       */
      readResource: (path: string) => Promise<string>;

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

type DataAttributes = {
  /**
   * 允许在模板中使用 data-* 自定义属性。
   */
  [K in `data-${string}`]?: string | number | boolean | null | undefined;
};

declare module 'vue' {
  interface HTMLAttributes extends DataAttributes {
    /**
     * 用于标注组件 slot 的 data 属性。
     */
    'data-slot'?: string | number | boolean | null | undefined;
  }
}

export {};
