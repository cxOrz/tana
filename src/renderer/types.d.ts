declare global {
  import type { ReminderPayload } from '../shared';
  import type { AppConfig } from '../shared';

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
       * 执行一个在主进程中定义的命令。
       * @param {string} command - 要执行的命令字符串。
       * @returns {Promise<any>} 命令执行的结果。
       */
      executeCommand: (command: string) => Promise<any>;

      /**
       * 从主进程加载应用配置。
       * @returns {Promise<AppConfig>} 应用的当前配置。
       */
      loadAppConfig: () => Promise<AppConfig>;

      /**
       * 将应用配置保存到主进程。
       * @param {AppConfig} config - 要保存的应用配置。
       * @returns {Promise<AppConfig>} 保存后的配置。
       */
      saveAppConfig: (config: AppConfig) => Promise<AppConfig>;

      /**
       * 请求主进程打开配置窗口。
       * @returns {Promise<void>}
       */
      openConfigWindow: () => Promise<void>;

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
    };
  }
}

/**
 * 为 `.vue` 文件提供类型定义，以便 TypeScript 可以正确处理它们。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>;
  export default component;
}

export {};
