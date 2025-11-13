import { app, nativeImage } from 'electron';
import { APP_USER_MODEL_ID, IPC_CHANNELS } from '../shared/constants';
import { loadAppConfig } from './config';
import { ReminderScheduler } from './reminderScheduler';
import { maybeShowSystemNotification } from './services/notifications';
import { createMainWindow, getMainWindow, updateMainWindowSize } from './windowManager';
import { createTray } from './trayManager';
import { registerIpcHandlers } from './ipcHandlers';
import { resolveAssetPath } from './utils';

/**
 * @file main.ts
 * @description Electron 应用的主入口点，负责协调应用的生命周期。
 */

let isQuitting = false;
let reminderScheduler: ReminderScheduler | null = null;

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('wm-window-animations-disabled');
}

/**
 * 获取或创建唯一的 ReminderScheduler 实例。
 * @returns {ReminderScheduler}
 */
function ensureScheduler(): ReminderScheduler {
  if (!reminderScheduler) {
    reminderScheduler = new ReminderScheduler((payload) => {
      const window = getMainWindow();
      if (!window || window.isDestroyed()) return;

      maybeShowSystemNotification(payload, () => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.WILL_SHOW);
          win.show();
          win.focus();
        }
      }).catch((err) => {
        console.warn('[notify] Failed to show system notification', err);
      });

      window.webContents.send(IPC_CHANNELS.PUSH_REMINDER, payload);
    });
  }
  return reminderScheduler;
}

/**
 * 异步初始化提醒调度器。
 */
async function initializeReminderScheduler(): Promise<void> {
  try {
    const config = await loadAppConfig();
    ensureScheduler().start(config);
  } catch (error) {
    console.error('[main] 初始化提醒调度器失败', error);
  }
}

// =============================================================================
// Application Lifecycle
// =============================================================================

app.on('before-quit', () => {
  isQuitting = true;
  reminderScheduler?.stop();
});

app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(async () => {
  // Restore window size from config
  try {
    const cfg = await loadAppConfig();
    if (cfg.petWindow?.scale && typeof cfg.petWindow.scale === 'number') {
      const scale = Math.max(0.5, Math.min(3, cfg.petWindow.scale));
      updateMainWindowSize(scale);
    }
  } catch (err) {
    console.warn('[main] Failed to load window size from config, using defaults.', err);
  }

  // Platform-specific setup
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(resolveAssetPath('icons', 'logo.png'));
    app.dock.setIcon(dockIcon);
    app.dock.hide();
  }
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }

  // Initialize app components
  createTray(() => isQuitting);
  createMainWindow(() => isQuitting);
  initializeReminderScheduler();
  registerIpcHandlers(ensureScheduler());

  app.on('activate', () => {
    const window = getMainWindow() ?? createMainWindow(() => isQuitting);
    if (window) {
      window.webContents.send(IPC_CHANNELS.WILL_SHOW);
      window.show();
      window.focus();
    }
  });
});
