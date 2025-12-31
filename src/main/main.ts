import { app, nativeImage, globalShortcut } from 'electron';
import { APP_USER_MODEL_ID, IPC_CHANNELS } from '../shared/constants';
import { loadAppConfig } from './services/config/config';
import type { AppConfig } from './services/config/config';
import { ReminderScheduler } from './services/reminderScheduler';
import {
  createMainWindow,
  getMainWindow,
  openJournalInput,
  openJournalReport,
} from './windows';
import { createTray } from './trayManager';
import { registerIpcHandlers } from './ipcHandlers';
import { resolveAssetPath } from './lib/utils';
import { JournalScheduler } from './services/journal/journalScheduler';

// =============================================================================
// State
// =============================================================================

let isQuit = false;
let reminderScheduler: ReminderScheduler | null = null;
let journalScheduler: JournalScheduler | null = null;
let currentJournalHotkey: string | null = null;
let savedWindowOpts: { width?: number; height?: number } = {};

// =============================================================================
// App Setup & Lifecycle Handlers
// =============================================================================

/**
 * 应用程序启动入口。
 */
function initializeApp() {
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_USER_MODEL_ID);
    app.commandLine.appendSwitch('wm-window-animations-disabled');
  }

  // 单例锁检查
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return;
  }

  // 事件监听
  app.on('second-instance', onSecondInstance);
  app.on('before-quit', onBeforeQuit);
  app.on('window-all-closed', onWindowAllClosed);
  app.on('activate', onActivate);

  // 核心启动逻辑
  app.whenReady().then(onAppReady);
}

/**
 * App Ready 回调：负责初始化所有服务和窗口。
 */
async function onAppReady() {
  // 1. 系统级设置 (Dock 等)
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(resolveAssetPath('icons', 'logo.png'));
    app.dock.setIcon(dockIcon);
    app.dock.hide();
  }

  // 2. 加载配置
  const { config, windowOpts } = await loadConfigAndWindowOpts();
  savedWindowOpts = windowOpts;

  // 3. 启动后台服务 (IPC, 调度器, 快捷键)
  registerIpcHandlers();
  startBackgroundServices(config);

  // 4. 初始化 UI (托盘, 窗口)
  createTray(() => isQuit, savedWindowOpts);
  createMainWindow(() => isQuit, savedWindowOpts);

  // 5. 处理启动参数 (CLI Flags)
  handleLaunchArgs();
}

function onSecondInstance(_event: Electron.Event, commandLine: string[]) {
  // 唤起主窗口
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  // 处理 CLI 参数
  handleLaunchArgs(commandLine);
}

function onBeforeQuit() {
  isQuit = true;
  reminderScheduler?.stop();
  journalScheduler?.stop();
  try {
    globalShortcut.unregisterAll();
  } catch {}
}

function onWindowAllClosed() {
  if (isQuit && process.platform !== 'darwin') {
    app.quit();
  }
}

function onActivate() {
  const window = createMainWindow(() => isQuit, savedWindowOpts);
  window.webContents.send(IPC_CHANNELS.WILL_SHOW);
  window.show();
  window.focus();
}

// =============================================================================
// Boot Helpers
// =============================================================================

async function loadConfigAndWindowOpts() {
  let config: AppConfig | null = null;
  const windowOpts: { width?: number; height?: number } = {};
  try {
    config = await loadAppConfig();
    if (config.mainWindow) {
      if (typeof config.mainWindow.width === 'number') {
        windowOpts.width = config.mainWindow.width;
      }
      if (typeof config.mainWindow.height === 'number') {
        windowOpts.height = config.mainWindow.height;
      }
    }
  } catch (error) {
    console.error('[main] 加载配置失败，使用默认窗口尺寸', error);
  }
  return { config, windowOpts };
}

function startBackgroundServices(config: AppConfig | null) {
  const scheduler = ensureReminderScheduler();
  const journal = ensureJournalScheduler();

  if (config) {
    try {
      scheduler.start(config);
      journal.start(config);
      registerHotkey(config);
    } catch (error) {
      console.warn('[main] 启动调度器失败', error);
    }
  }
}

function handleLaunchArgs(argv: string[] = process.argv) {
  if (argv.includes('--open-journal-input')) {
    openJournalInput();
  }
  if (argv.includes('--open-journal-report')) {
    openJournalReport();
  }
}

// =============================================================================
// Service Management
// =============================================================================

function ensureReminderScheduler(): ReminderScheduler {
  if (!reminderScheduler) {
    reminderScheduler = new ReminderScheduler();
  }
  return reminderScheduler;
}

function ensureJournalScheduler(): JournalScheduler {
  if (!journalScheduler) {
    journalScheduler = new JournalScheduler(() => openJournalReport());
  }
  return journalScheduler;
}

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

// =============================================================================
// Execution
// =============================================================================

initializeApp();
