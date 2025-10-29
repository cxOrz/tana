import { contextBridge, ipcRenderer } from 'electron';
import type { AppConfig, ReminderPayload } from '../shared';

// 暴露给渲染进程的API
const electronAPI = {
  executeCommand: (command: string) => ipcRenderer.invoke('execute-command', command),
  loadAppConfig: (): Promise<AppConfig> => ipcRenderer.invoke('config:load'),
  saveAppConfig: (config: AppConfig): Promise<AppConfig> => ipcRenderer.invoke('config:save', config),
  openConfigWindow: (): Promise<void> => ipcRenderer.invoke('config:open'),
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
