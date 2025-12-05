import { app, globalShortcut, nativeImage } from 'electron';
import { APP_USER_MODEL_ID, IPC_CHANNELS } from '../shared/constants';
import { loadAppConfig } from './config';
import type { AppConfig } from './config';
import { ReminderScheduler } from './reminderScheduler';
import { maybeShowSystemNotification } from './services/notifications';
import {
  createJournalInputWindow,
  createJournalReportWindow,
  createMainWindow,
  getMainWindow,
  updateMainWindowSize,
} from './windowManager';
import { createTray } from './trayManager';
import { registerIpcHandlers } from './ipcHandlers';
import { resolveAssetPath } from './utils';
import { JournalScheduler } from './services/journalScheduler';

/**
 * @file main.ts
 * @description Electron 应用的主入口点，负责协调应用的生命周期。
 */

let isQuitting = false;
let reminderScheduler: ReminderScheduler | null = null;
let journalScheduler: JournalScheduler | null = null;
let currentJournalHotkey: string | null = null;

// Handle the --open-journal flag
const openJournalOnStart = process.argv.includes('--open-journal');

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    // Handle --open-journal flag for second instance
    if (commandLine.includes('--open-journal')) {
      const win = createJournalInputWindow();
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
    }
  });
}

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
 * 获取或创建日志调度器。
 * @returns {JournalScheduler}
 */
function ensureJournalScheduler(): JournalScheduler {
  if (!journalScheduler) {
    journalScheduler = new JournalScheduler(() => openJournalReport());
  }
  return journalScheduler;
}

/**
 * 打开日报窗口。
 * @param {string} [dayStamp] - 指定日期，默认当天。
 */
function openJournalReport(dayStamp?: string): void {
  const win = createJournalReportWindow();
  if (win && !win.isDestroyed()) {
    const sendDay = () => win.webContents.send(IPC_CHANNELS.JOURNAL_OPEN_REPORT, dayStamp);
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', sendDay);
    } else {
      sendDay();
    }
    win.show();
    win.focus();
  }
}

/**
 * 刷新日志快捷键注册。
 * @param {AppConfig} config - 应用配置。
 */
function refreshJournalHotkey(config: AppConfig): void {
  const hotkey = config.journal?.hotkey;
  if (currentJournalHotkey) {
    try {
      globalShortcut.unregister(currentJournalHotkey);
    } catch {}
  }
  if (hotkey) {
    const ok = globalShortcut.register(hotkey, () => {
      const win = createJournalInputWindow();
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus();
      }
    });
    if (ok) {
      currentJournalHotkey = hotkey;
    } else {
      console.warn('[journal] 注册快捷键失败', hotkey);
      currentJournalHotkey = null;
    }
  }
}

// =============================================================================
// Application Lifecycle
// =============================================================================

app.on('before-quit', () => {
  isQuitting = true;
  reminderScheduler?.stop();
  journalScheduler?.stop();
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(async () => {
  // Platform-specific setup
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(resolveAssetPath('icons', 'logo.png'));
    app.dock.setIcon(dockIcon);
    app.dock.hide();
  }
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }

  let loadedConfig: AppConfig | null = null;
  try {
    loadedConfig = await loadAppConfig();
    if (loadedConfig.petWindow?.scale && typeof loadedConfig.petWindow.scale === 'number') {
      const scale = Math.max(0.5, Math.min(2, loadedConfig.petWindow.scale)); // 缩放限制在 0.5 - 2 之间
      updateMainWindowSize(scale);
    }
  } catch (error) {
    console.error('[main] 加载配置失败，使用默认窗口尺寸', error);
  }

  const scheduler = ensureScheduler();
  const journal = ensureJournalScheduler();
  if (loadedConfig) {
    try {
      scheduler.start(loadedConfig);
      journal.start(loadedConfig);
      refreshJournalHotkey(loadedConfig);
    } catch (error) {
      console.warn('[main] 启动调度器失败', error);
    }
  }

  // Initialize app components
  createTray(() => isQuitting);
  createMainWindow(() => isQuitting);
  registerIpcHandlers();

  // Handle --open-journal flag on first launch
  if (openJournalOnStart) {
    const win = createJournalInputWindow();
    if (win && !win.isDestroyed()) {
      win.show();
      win.focus();
    }
  }

  app.on('activate', () => {
    const window = getMainWindow() ?? createMainWindow(() => isQuitting);
    if (window) {
      window.webContents.send(IPC_CHANNELS.WILL_SHOW);
      window.show();
      window.focus();
    }
  });
});
