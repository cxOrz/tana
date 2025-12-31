import { app, Menu, Tray, nativeImage, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { createMainWindow, getMainWindow, openJournalReport } from './windows';
import { resolveAssetPath } from './lib/utils';

let tray: Tray | null = null;

// =============================================================================
// Helpers
// =============================================================================

/**
 * 向渲染进程发送一个隐藏请求，并在收到确认后执行回调。
 */
function requestRendererExitThen(action: () => void) {
  const win = getMainWindow();
  if (!win || win.isDestroyed()) {
    action();
    return;
  }
  let done = false;
  const onAck = (e: Electron.IpcMainEvent) => {
    if (done) return;
    if (e.sender === win.webContents) {
      done = true;
      ipcMain.removeListener(IPC_CHANNELS.HIDE_ACK, onAck);
      action();
    }
  };
  ipcMain.on(IPC_CHANNELS.HIDE_ACK, onAck);
  win.webContents.send(IPC_CHANNELS.WILL_HIDE);
}

// =============================================================================
// Main Logic
// =============================================================================

/**
 * 创建系统托盘图标。
 */
export function createTray(isQuitting: () => boolean): void {
  if (tray) {
    return;
  }

  const trayIconPath =
    process.platform === 'win32'
      ? resolveAssetPath('icons', 'logo.ico')
      : resolveAssetPath('icons', 'logo.png');
  const icon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(icon);
  tray.setToolTip('Tana');

  const toggleWindow = () => {
    const window = createMainWindow(isQuitting);
    if (window.isVisible()) {
      // 渲染层渐出动画，然后隐藏窗口
      requestRendererExitThen(() => window.hide());
    } else {
      // 渲染层渐进动画，然后显示窗口
      window.webContents.send(IPC_CHANNELS.WILL_SHOW);
      window.show();
      window.focus();
    }
  };

  const showJournalReport = () => {
    openJournalReport();
  };

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏主窗口',
      click: toggleWindow,
    },
    {
      label: '打开日志窗口',
      click: showJournalReport,
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}
