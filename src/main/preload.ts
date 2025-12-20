import { contextBridge, ipcRenderer } from 'electron';
import type { AddJournalEntryInput, JournalDay, JournalSummary } from '../shared/journalTypes';

// 由于开启 sandbox 后 preload 无法访问相对模块，这里内联 IPC 渠道常量。
const IPC_CHANNELS = {
  WILL_SHOW: 'app:will-show',
  WILL_HIDE: 'app:will-hide',
  HIDE_ACK: 'app:hide-ack',
  JOURNAL_ADD_ENTRY: 'journal:add-entry',
  JOURNAL_GET_DAY: 'journal:get-day',
  JOURNAL_LIST_DAYS: 'journal:list-days',
  JOURNAL_SET_SUMMARY: 'journal:set-summary',
  JOURNAL_OPEN_REPORT: 'journal:open-report',
} as const;

/**
 * 定义并暴露给渲染进程的API。
 * 这是渲染进程与主进程之间安全通信的桥梁。
 * @type {ElectronAPI}
 */
const electronAPI = {
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
   * 写入一条日志记录。
   * @param {AddJournalEntryInput} input - 记录内容。
   * @returns {Promise<any>} 持久化后的记录。
   */
  addJournalEntry: (input: AddJournalEntryInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_ADD_ENTRY, input),

  /**
   * 获取某一天的日志数据。
   * @param {string} [dayStamp] - 目标日期，默认当天。
   * @returns {Promise<JournalDay>}
   */
  getJournalDay: (dayStamp?: string): Promise<JournalDay> =>
    ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_GET_DAY, dayStamp),

  /**
   * 列出已有日期。
   * @param {number} [limit] - 限制数量。
   * @returns {Promise<string[]>}
   */
  listJournalDays: (limit?: number): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_LIST_DAYS, limit),

  /**
   * 写入日报摘要。
   * @param {string} dayStamp - 日期。
   * @param {JournalSummary} summary - 摘要。
   * @returns {Promise<JournalSummary>}
   */
  setJournalSummary: (dayStamp: string, summary: JournalSummary): Promise<JournalSummary> =>
    ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_SET_SUMMARY, dayStamp, summary),

  /**
   * 打开日报窗口。
   * @param {string} [dayStamp] - 目标日期。
   * @returns {Promise<void>}
   */
  openJournalReport: (dayStamp?: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_OPEN_REPORT, dayStamp),

  /**
   * 监听主进程发来的“打开日报”事件。
   * @param {(dayStamp?: string) => void} callback - 回调。
   * @returns {() => void} 取消监听函数。
   */
  onJournalOpenReport: (callback: (dayStamp?: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, dayStamp?: string) => callback(dayStamp);
    ipcRenderer.on(IPC_CHANNELS.JOURNAL_OPEN_REPORT, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.JOURNAL_OPEN_REPORT, listener);
  },
};

// 在 window 对象上声明 electronAPI 类型
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

// 将API安全地暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
