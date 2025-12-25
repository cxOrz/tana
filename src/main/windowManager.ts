import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { IPC_CHANNELS, PET_WINDOW_BASE_SIZE } from '../shared/constants';
import { resolveAssetPath } from './utils';

const DEV_SERVER_URL = 'http://localhost:5173/';

let mainWindow: BrowserWindow | null = null; // 主窗口实例
let journalInputWindow: BrowserWindow | null = null; // 速记窗口实例
let journalReportWindow: BrowserWindow | null = null; // 日报窗口实例

// 窗口大小
let windowSize = {
  width: PET_WINDOW_BASE_SIZE.WIDTH,
  height: PET_WINDOW_BASE_SIZE.HEIGHT,
};

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

/**
 * 创建主窗口 (宠物窗口)。
 */
export function createMainWindow(isQuitting: () => boolean): BrowserWindow {
  if (mainWindow) {
    return mainWindow;
  }

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
    if (!isQuitting()) {
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

  loadRendererPage(journalInputWindow, '/journal-input'); // 加载日志路由

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
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
  });

  journalReportWindow.on('closed', () => {
    journalReportWindow = null;
  });

  loadRendererPage(journalReportWindow, '/journal');

  journalReportWindow.once('ready-to-show', () => {
    journalReportWindow?.show();
    journalReportWindow?.focus();
  });

  return journalReportWindow;
}

/**
 * 获取主窗口实例。
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * 根据配置更新主窗口的尺寸。
 */
export function updateMainWindowSize(scale: number) {
  windowSize = {
    width: Math.round(PET_WINDOW_BASE_SIZE.WIDTH * scale),
    height: Math.round(PET_WINDOW_BASE_SIZE.HEIGHT * scale),
  };
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.setContentSize(windowSize.width, windowSize.height);
  }
}

/**
 * 打开日报窗口。
 * @param {string} [dayStamp] - 指定日期，默认当天。
 */
export function openJournalReport(dayStamp?: string): void {
  const win = createJournalReportWindow();

  const sendDay = () => win.webContents.send(IPC_CHANNELS.JOURNAL_OPEN_REPORT, dayStamp);
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', sendDay);
  } else {
    sendDay();
  }
  win.show();
  win.focus();
}
