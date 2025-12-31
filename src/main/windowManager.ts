import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { IPC_CHANNELS, PET_WINDOW_BASE_SIZE } from '../shared/constants';
import { resolveAssetPath } from './utils';

// =============================================================================
// State & Constants
// =============================================================================

const DEV_SERVER_URL = 'http://localhost:5173/';

let mainWindow: BrowserWindow | null = null; // 主窗口实例
let journalInputWindow: BrowserWindow | null = null; // 速记窗口实例
let journalReportWindow: BrowserWindow | null = null; // 日报窗口实例

// =============================================================================
// Helpers
// =============================================================================

/**
 * 为指定的窗口加载渲染进程页面。
 */
function loadRendererPage(window: BrowserWindow, route: '/' | '/journal' | '/journal-input'): void {
  if (!app.isPackaged) {
    window.loadURL(`${DEV_SERVER_URL}#${route}`);
    return;
  }

  const indexPath = join(__dirname, '../renderer/index.html');
  const hashOption = route.slice(1);
  window.loadFile(indexPath, { hash: hashOption });
}

// =============================================================================
// Main Window (Pet)
// =============================================================================

/**
 * 创建主窗口 (宠物窗口)。
 */
export function createMainWindow(isQuit: () => boolean, scale: number = 1): BrowserWindow {
  if (mainWindow) {
    return mainWindow;
  }

  const windowSize = {
    width: Math.round(PET_WINDOW_BASE_SIZE.WIDTH * scale),
    height: Math.round(PET_WINDOW_BASE_SIZE.HEIGHT * scale),
  };

  const windowIcon =
    process.platform === 'win32'
      ? resolveAssetPath('icons', 'logo.ico')
      : resolveAssetPath('icons', 'logo.png');

  mainWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    icon: windowIcon,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });

  mainWindow.on('close', (event) => {
    // 阻止默认行为，不销毁，留在托盘
    if (!isQuit()) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 阻止弹出新窗口；用系统浏览器打开链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // 窗口显示前，向渲染层发出信息加载过渡动画
  mainWindow.once('ready-to-show', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WILL_SHOW);
    mainWindow?.show();
  });

  loadRendererPage(mainWindow, '/'); // 加载主页

  return mainWindow;
}

// =============================================================================
// Journal Input Window
// =============================================================================

/**
 * 创建快速输入窗口。
 */
export function createJournalInputWindow(): BrowserWindow {
  if (journalInputWindow) {
    return journalInputWindow;
  }

  journalInputWindow = new BrowserWindow({
    width: 420,
    height: 220,
    resizable: false,
    autoHideMenuBar: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
  });

  journalInputWindow.on('closed', () => {
    journalInputWindow = null;
  });

  // 拦截关闭，改为隐藏
  journalInputWindow.on('close', (event) => {
    event.preventDefault();
    journalInputWindow?.hide();
  });

  loadRendererPage(journalInputWindow, '/journal-input');

  journalInputWindow.once('ready-to-show', () => {
    journalInputWindow?.show();
    journalInputWindow?.focus();
  });

  return journalInputWindow;
}

/**
 * 打开日志输入窗口。
 */
export function openJournalInput(): void {
  const win = createJournalInputWindow();
  win.show();
  win.focus();
}

// =============================================================================
// Journal Report Window
// =============================================================================

/**
 * 创建日报窗口。
 */
export function createJournalReportWindow(): BrowserWindow {
  if (journalReportWindow) {
    return journalReportWindow;
  }

  journalReportWindow = new BrowserWindow({
    width: 720,
    height: 860,
    resizable: true,
    autoHideMenuBar: true,
    frame: true,
    show: false,
    backgroundColor: '#020617',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
  });

  journalReportWindow.on('closed', () => {
    journalReportWindow = null;
  });

  journalReportWindow.on('close', (event) => {
    event.preventDefault();
    journalReportWindow?.hide();
  });

  loadRendererPage(journalReportWindow, '/journal');

  journalReportWindow.once('ready-to-show', () => {
    journalReportWindow?.show();
    journalReportWindow?.focus();
  });

  return journalReportWindow;
}

/**
 * 打开日报窗口。
 * @param {string} [dayStamp] - 指定日期，默认当天。
 */
export function openJournalReport(dayStamp?: string): void {
  const win = createJournalReportWindow();
  if (!win.isFocused()) {
    win.show();
    win.focus();
  }

  const sendDay = () => win.webContents.send(IPC_CHANNELS.JOURNAL_OPEN_REPORT, dayStamp);
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', sendDay);
  } else {
    sendDay();
  }
}

// =============================================================================
// Public Accessors
// =============================================================================

/**
 * 获取主窗口实例。
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
