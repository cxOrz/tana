import { app } from 'electron';
import { join } from 'path';

const DEV_SERVER_URL = 'http://localhost:5173/';

type RoutePath = '/' | '/journal' | '/journal-input';

/**
 * 为指定的窗口加载渲染进程页面。
 */
export function loadRendererPage(window: Electron.BrowserWindow, route: RoutePath): void {
  if (!app.isPackaged) {
    window.loadURL(`${DEV_SERVER_URL}#${route}`);
    return;
  }

  const indexPath = join(__dirname, '../../renderer/index.html');
  const hashOption = route.slice(1);
  window.loadFile(indexPath, { hash: hashOption });
}
