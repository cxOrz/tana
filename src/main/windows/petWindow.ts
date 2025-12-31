import { BrowserWindow, screen, shell } from 'electron';
import { join } from 'path';
import { IPC_CHANNELS } from '../../shared/constants';
import { resolveAssetPath } from '../lib/utils';
import { loadRuntimeStateSync, saveMainWindowBounds } from '../services/stateStore';
import { loadRendererPage } from './shared';

let mainWindow: BrowserWindow | null = null;
let saveBoundsTimer: NodeJS.Timeout | null = null;

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const resolveMainWindowPosition = (
  windowSize: { width: number; height: number }
): { x: number; y: number } | undefined => {
  const saved = loadRuntimeStateSync().mainWindow;
  if (!saved) return undefined;

  const display = screen.getDisplayMatching({
    x: saved.x,
    y: saved.y,
    width: saved.width,
    height: saved.height,
  });
  const area = display.workArea;
  const maxX = area.x + area.width - windowSize.width;
  const maxY = area.y + area.height - windowSize.height;

  return {
    x: clamp(saved.x, area.x, maxX),
    y: clamp(saved.y, area.y, maxY),
  };
};

const scheduleSaveMainBounds = (): void => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const { x, y, width, height } = mainWindow.getBounds();
    saveMainWindowBounds({ x, y, width, height }).catch((error) => {
      console.warn('[window] 保存窗口位置失败', error);
    });
    saveBoundsTimer = null;
  }, 150);
};

/**
 * 创建主窗口 (宠物窗口)。
 */
export function createMainWindow(
  isQuit: () => boolean,
  options: { width?: number; height?: number } = {}
): BrowserWindow {
  if (mainWindow) return mainWindow;

  const { width, height } = options;
  const windowSize = {
    width: width || 450,
    height: height || 360,
  };

  const restoredPosition = resolveMainWindowPosition(windowSize);
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
    x: restoredPosition?.x,
    y: restoredPosition?.y,
    webPreferences: {
      preload: join(__dirname, '../preload.js'),
      backgroundThrottling: false,
    },
  });

  mainWindow.on('close', (event) => {
    if (!isQuit()) event.preventDefault();
  });

  mainWindow.on('closed', () => {
    if (saveBoundsTimer) {
      clearTimeout(saveBoundsTimer);
      saveBoundsTimer = null;
    }
    mainWindow = null;
  });

  mainWindow.on('move', scheduleSaveMainBounds);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.WILL_SHOW);
    mainWindow?.show();
  });

  loadRendererPage(mainWindow, '/');
  return mainWindow;
}

/**
 * 获取主窗口实例。
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
