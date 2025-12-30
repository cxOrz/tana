import { app, globalShortcut, nativeImage } from 'electron';
import { APP_USER_MODEL_ID, IPC_CHANNELS } from '../shared/constants';
import { loadAppConfig } from './config';
import type { AppConfig } from './config';
import { ReminderScheduler } from './reminderScheduler';
import {
  createMainWindow,
  getMainWindow,
  openJournalInput,
  openJournalReport,
} from './windowManager';
import { createTray } from './trayManager';
import { registerIpcHandlers } from './ipcHandlers';
import { resolveAssetPath } from './utils';
import { JournalScheduler } from './services/journalScheduler';

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID);
  app.commandLine.appendSwitch('wm-window-animations-disabled');
}

let isQuit = false;
let reminderScheduler: ReminderScheduler | null = null;
let journalScheduler: JournalScheduler | null = null;
let currentJournalHotkey: string | null = null;

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

    // Handle --open-journal-input flag for second instance
    if (commandLine.includes('--open-journal-input')) {
      openJournalInput();
    }

    // Handle --open-journal-report flag for second instance
    if (commandLine.includes('--open-journal-report')) {
      openJournalReport();
    }
  });
}

// =============================================================================
// Events Register
// =============================================================================

app.on('before-quit', () => {
  isQuit = true;
  reminderScheduler?.stop();
  journalScheduler?.stop();
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('window-all-closed', () => {
  if (isQuit && process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(async () => {
  // macOS
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(resolveAssetPath('icons', 'logo.png'));
    app.dock.setIcon(dockIcon);
    app.dock.hide();
  }

  let loadedConfig: AppConfig | null = null;
  let petScale = 1;
  try {
    loadedConfig = await loadAppConfig();
    if (loadedConfig.petWindow?.scale && typeof loadedConfig.petWindow.scale === 'number') {
      petScale = Math.max(0.5, Math.min(2, loadedConfig.petWindow.scale)); // 缩放限制在 0.5 - 2 之间
    }
  } catch (error) {
    console.error('[main] 加载配置失败，使用默认窗口尺寸', error);
  }

  const scheduler = ensureReminderScheduler();
  const journal = ensureJournalScheduler();
  if (loadedConfig) {
    try {
      scheduler.start(loadedConfig); // 启动消息调度器
      journal.start(loadedConfig); // 启动日志调度器
      registerHotkey(loadedConfig); // 注册快捷键
    } catch (error) {
      console.warn('[main] 启动调度器失败', error);
    }
  }

  // Initialize app components
  createTray(() => isQuit);
  createMainWindow(() => isQuit, petScale);
  registerIpcHandlers();

  // Handle --open-journal-input flag on first launch
  if (process.argv.includes('--open-journal-input')) {
    openJournalInput();
  }

  // Handle --open-journal-report flag on first launch
  if (process.argv.includes('--open-journal-report')) {
    openJournalReport();
  }

  app.on('activate', () => {
    const window = createMainWindow(() => isQuit);
    window.webContents.send(IPC_CHANNELS.WILL_SHOW);
    window.show();
    window.focus();
  });
});

// =============================================================================
// Function Definition
// =============================================================================

/**
 * 获取或创建唯一的 ReminderScheduler 实例。
 */
function ensureReminderScheduler(): ReminderScheduler {
  if (!reminderScheduler) {
    reminderScheduler = new ReminderScheduler();
  }
  return reminderScheduler;
}

/**
 * 获取或创建 JournalScheduler 实例。
 */
function ensureJournalScheduler(): JournalScheduler {
  if (!journalScheduler) {
    journalScheduler = new JournalScheduler(() => openJournalReport());
  }
  return journalScheduler;
}

/**
 * 刷新日志快捷键注册。
 * @param {AppConfig} config - 应用配置。
 */
function registerHotkey(config: AppConfig): void {
  const hotkey = config.journal?.hotkey;
  if (currentJournalHotkey) {
    try {
      globalShortcut.unregister(currentJournalHotkey);
    } catch {}
  }
  if (hotkey) {
    const ok = globalShortcut.register(hotkey, () => {
      openJournalInput();
    });
    if (ok) {
      currentJournalHotkey = hotkey;
    } else {
      console.warn('[journal] 注册快捷键失败', hotkey);
      currentJournalHotkey = null;
    }
  }
}
