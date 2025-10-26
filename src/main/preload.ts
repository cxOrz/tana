import { contextBridge, ipcRenderer } from 'electron';
import type { ReminderPayload } from '../shared';

// 暴露给渲染进程的API
const electronAPI = {
  executeCommand: (command: string) => ipcRenderer.invoke('execute-command', command),
  onReminder: (callback: (payload: ReminderPayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ReminderPayload) => callback(payload);
    ipcRenderer.on('reminder:push', listener);
    return () => {
      ipcRenderer.removeListener('reminder:push', listener);
    };
  },
};

// 类型声明
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}

// 将API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
