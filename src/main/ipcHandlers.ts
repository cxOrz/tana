import { ipcMain } from 'electron';
import type { ReminderPayload, AppConfig } from '../shared';
import { IPC_CHANNELS } from '../shared/constants';
import { loadAppConfig, saveAppConfig } from './config';
import { getMainWindow, updateMainWindowSize, createConfigWindow } from './windowManager';
import { maybeShowSystemNotification } from './services/notifications';
import { ReminderScheduler } from './reminderScheduler';

/**
 * @file ipcHandlers.ts
 * @description
 * 注册和管理所有主进程的 IPC 事件监听器。
 */

/**
 * 注册所有的 IPC 事件处理程序。
 * @param {ReminderScheduler} scheduler - 提醒调度器实例。
 */
export function registerIpcHandlers(scheduler: ReminderScheduler): void {
  ipcMain.handle(IPC_CHANNELS.EXECUTE_COMMAND, async (_, command: string) => {
    try {
      console.log(`执行命令: ${command}`);
      return { success: true, command, note: '命令已记录，实际执行需要额外的安全措施' };
    } catch (error) {
      console.error('Execute command failed:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, async () => {
    const config = await loadAppConfig();
    return config;
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, async (_event, config: AppConfig) => {
    const persisted = await saveAppConfig(config);

    try {
      scheduler.start(persisted);
    } catch (error) {
      console.error('[config] 更新调度器失败', error);
    }

    try {
      if (persisted.petWindow?.scale && typeof persisted.petWindow.scale === 'number') {
        const scale = Math.max(0.5, Math.min(3, persisted.petWindow.scale));
        updateMainWindowSize(scale);
      }
    } catch (error) {
      console.warn('[config] 应用窗口尺寸失败', error);
    }

    return persisted;
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_CONFIG_WINDOW, async () => {
    const configWin = createConfigWindow();
    if (!configWin.isDestroyed() && !configWin.isVisible()) {
      configWin.show();
    }
    configWin.focus();
  });

  ipcMain.handle(
    IPC_CHANNELS.SHOW_SYSTEM_NOTIFICATION,
    async (_event, payload: ReminderPayload) => {
      try {
        await maybeShowSystemNotification(payload, () => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.WILL_SHOW);
            win.show();
            win.focus();
          }
        });
      } catch (err) {
        console.warn('[notify] Failed to show system notification (renderer request)', err);
      }
    }
  );
}
