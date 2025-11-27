import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { IPC_CHANNELS, PET_WINDOW_BASE_SIZE } from '../shared/constants';
import { resolveAssetPath } from './utils';

/**
 * @file windowManager.ts
 * @description
 * 负责创建和管理应用的所有窗口 (BrowserWindow)。
 */

let mainWindow: BrowserWindow | null = null;
let journalInputWindow: BrowserWindow | null = null;
let journalReportWindow: BrowserWindow | null = null;

let initialWindowSize = {
  width: PET_WINDOW_BASE_SIZE.WIDTH,
  height: PET_WINDOW_BASE_SIZE.HEIGHT,
};

/**
 * 获取渲染进程的入口 URL。
 * @returns {string | null}
 */
function resolveRendererEntry(): string | null {
  return process.env.VITE_DEV_SERVER_URL ?? process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL ?? null;
}

/**
 * 为指定的窗口加载渲染进程页面。
 * @param {BrowserWindow} window - 目标窗口。
 * @param {'main' | 'config'} page - 要加载的页面。
 */
function loadRendererPage(
  window: BrowserWindow,
  page: 'main' | 'journal' | 'journal-input'
): void {
  const devServerUrl = resolveRendererEntry();
  const hash =
    page === 'journal'
      ? '/journal'
      : page === 'journal-input'
      ? '/journal-input'
      : '/';

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.hash = hash;
    window.loadURL(url.toString());
    return;
  }

  if (!app.isPackaged) {
    const url = new URL('http://localhost:5173/');
    url.hash = hash;
    window.loadURL(url.toString());
    return;
  }

  const indexPath = join(__dirname, '../renderer/index.html');
  const hashOption =
    page === 'journal' ? 'journal' : page === 'journal-input' ? 'journal-input' : undefined;
  window.loadFile(indexPath, hashOption ? { hash: hashOption } : undefined);
}

/**
 * 创建主窗口 (宠物窗口)。
 * @param {boolean} isQuitting - 一个闭包，用于判断应用是否正在退出。
 * @returns {BrowserWindow}
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
    width: initialWindowSize.width,
    height: initialWindowSize.height,
    useContentSize: true,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    icon: windowIcon,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      // requestRendererExitThen(() => mainWindow && mainWindow.hide());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.WILL_SHOW);
      mainWindow.show();
      mainWindow.focus();
    }
  });

  loadRendererPage(mainWindow, 'main');

  return mainWindow;
}

/**
 * 创建快速输入窗口。
 * @returns {BrowserWindow}
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
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  journalInputWindow.on('closed', () => {
    journalInputWindow = null;
  });

  loadRendererPage(journalInputWindow, 'journal-input');

  journalInputWindow.once('ready-to-show', () => {
    journalInputWindow?.show();
    journalInputWindow?.focus();
  });

  return journalInputWindow;
}

/**
 * 创建日报窗口。
 * @returns {BrowserWindow}
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
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  journalReportWindow.on('closed', () => {
    journalReportWindow = null;
  });

  loadRendererPage(journalReportWindow, 'journal');

  journalReportWindow.once('ready-to-show', () => {
    journalReportWindow?.show();
    journalReportWindow?.focus();
  });

  return journalReportWindow;
}

/**
 * 获取主窗口实例。
 * @returns {BrowserWindow | null}
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * 根据配置更新主窗口的尺寸。
 * @param {number} scale - 缩放比例。
 */
export function updateMainWindowSize(scale: number) {
  initialWindowSize = {
    width: Math.round(PET_WINDOW_BASE_SIZE.WIDTH * scale),
    height: Math.round(PET_WINDOW_BASE_SIZE.HEIGHT * scale),
  };
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.setContentSize(initialWindowSize.width, initialWindowSize.height);
  }
}
