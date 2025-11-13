import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig, ReminderPayload } from '../shared';
import { IPC_CHANNELS } from '../shared/constants';

/**
 * @typedef {object} ElectronAPI
 * @property {(command: string) => Promise<any>} executeCommand - 执行一个在主进程中定义的命令。
 * @property {() => Promise<AppConfig>} loadAppConfig - 从主进程加载应用配置。
 * @property {(config: AppConfig) => Promise<AppConfig>} saveAppConfig - 将应用配置保存到主进程。
 * @property {() => Promise<void>} openConfigWindow - 请求主进程打开配置窗口。
 * @property {(callback: () => void) => () => void} onAppWillHide - 注册一个在应用即将隐藏时触发的回调。
 * @property {(callback: () => void) => () => void} onAppWillShow - 注册一个在应用即将显示时触发的回调。
 * @property {() => void} notifyHideReady - 通知主进程渲染器已经准备好隐藏。
 * @property {(callback: (payload: ReminderPayload) => void) => () => void} onReminder - 注册一个用于接收提醒事件的回调。
 * @property {(payload: ReminderPayload) => Promise<void>} notifySystem - 请求主进程显示一个系统通知。
 */

/**
 * 定义并暴露给渲染进程的API。
 * 这是渲染进程与主进程之间安全通信的桥梁。
 * @type {ElectronAPI}
 */
const electronAPI = {
  /**
   * 执行一个在主进程中定义的命令。
   * @param {string} command - 要执行的命令字符串。
   * @returns {Promise<any>} 命令执行的结果。
   */
  executeCommand: (command: string) => ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_COMMAND, command),

  /**
   * 从主进程加载应用配置。
   * @returns {Promise<AppConfig>} 应用的当前配置。
   */
  loadAppConfig: (): Promise<AppConfig> => ipcRenderer.invoke(IPC_CHANNELS.LOAD_CONFIG),

  /**
   * 将应用配置保存到主进程。
   * @param {AppConfig} config - 要保存的应用配置。
   * @returns {Promise<AppConfig>} 保存后的配置。
   */
  saveAppConfig: (config: AppConfig): Promise<AppConfig> =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, config),

  /**
   * 请求主进程打开配置窗口。
   * @returns {Promise<void>}
   */
  openConfigWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_CONFIG_WINDOW),

  /**
   * 注册一个在应用即将隐藏时触发的回调。
   * @param {() => void} callback - 回调函数。
   * @returns {() => void} 一个用于取消监听的函数。
   */
  onAppWillHide: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.WILL_HIDE, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WILL_HIDE, listener);
  },

  /**
   * 注册一个在应用即将显示时触发的回调。
   * @param {() => void} callback - 回调函数。
   * @returns {() => void} 一个用于取消监听的函数。
   */
  onAppWillShow: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.WILL_SHOW, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WILL_SHOW, listener);
  },

  /**
   * 通知主进程渲染器已经准备好隐藏。
   * 这通常在执行完隐藏动画后调用。
   */
  notifyHideReady: () => ipcRenderer.send(IPC_CHANNELS.HIDE_ACK),

  /**
   * 注册一个用于接收提醒事件的回调。
   * @param {(payload: ReminderPayload) => void} callback - 当收到提醒时调用的回调函数。
   * @returns {() => void} 一个用于取消监听的函数。
   */
  onReminder: (callback: (payload: ReminderPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ReminderPayload) =>
      callback(payload);
    ipcRenderer.on(IPC_CHANNELS.PUSH_REMINDER, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PUSH_REMINDER, listener);
    };
  },

  /**
   * 请求主进程显示一个系统通知。
   * @param {ReminderPayload} payload - 提醒的数据负载。
   * @returns {Promise<void>}
   */
  notifySystem: (payload: ReminderPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_SYSTEM_NOTIFICATION, payload),
};

// 在 window 对象上声明 electronAPI 类型
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

// 将API安全地暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
