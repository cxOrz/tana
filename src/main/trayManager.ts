import { app, Menu, Tray, nativeImage, ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { createMainWindow, getMainWindow } from './windowManager';
import { resolveAssetPath } from './utils';

/**
 * @file trayManager.ts
 * @description
 * 负责创建和管理系统托盘图标及其上下文菜单。
 */

let tray: Tray | null = null;

/**
 * 向渲染进程发送一个隐藏请求，并在收到确认后执行回调。
 * @param {() => void} action - 在收到确认后执行的回调。
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

/**
 * 创建系统托盘图标。
 * @param {() => boolean} isQuitting - 一个闭包，用于判断应用是否正在退出。
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
  tray.setToolTip('Tana is here');

  const toggleWindow = () => {
    const window = createMainWindow(isQuitting);
    if (window.isVisible()) {
      requestRendererExitThen(() => window.hide());
    } else {
      window.webContents.send(IPC_CHANNELS.WILL_SHOW);
      window.show();
      window.focus();
    }
  };

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: toggleWindow,
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
