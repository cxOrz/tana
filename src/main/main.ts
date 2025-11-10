import { app, BrowserWindow, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import { join } from 'path';
import type { ReminderPayload } from '../shared';
import { loadAppConfig, saveAppConfig, type AppConfig } from './config';
import { ReminderScheduler } from './reminderScheduler';
import { maybeShowSystemNotification } from './services/notifications';

let mainWindow: BrowserWindow | null = null;
let configWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let reminderScheduler: ReminderScheduler | null = null;
const BASE_WINDOW = { width: 450, height: 360 };
let initialWindowSize: { width: number; height: number } = { ...BASE_WINDOW };

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('wm-window-animations-disabled');
}

const resolveAssetPath = (...paths: string[]): string => {
  const assetsBase = app.isPackaged
    ? join(process.resourcesPath, 'assets')
    : join(__dirname, '../../assets');
  return join(assetsBase, ...paths);
};

const resolveRendererEntry = (): string | null => {
  return process.env.VITE_DEV_SERVER_URL ?? process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL ?? null;
};

const loadRendererPage = (window: BrowserWindow, page: 'main' | 'config'): void => {
  const devServerUrl = resolveRendererEntry();
  const hash = page === 'config' ? '/config' : '/';

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
  const hashOption = page === 'config' ? 'config' : undefined;
  window.loadFile(indexPath, hashOption ? { hash: hashOption } : undefined);
};

function createWindow(): BrowserWindow {
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
    if (!isQuitting) {
      event.preventDefault();
      requestRendererExitThen(() => mainWindow && mainWindow.hide());
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
      mainWindow.webContents.send('app:will-show');
      mainWindow.show();
      mainWindow.focus();
    }
  });

  loadRendererPage(mainWindow, 'main');

  return mainWindow;
}

function createConfigWindow(): BrowserWindow {
  if (configWindow) {
    return configWindow;
  }

  configWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 840,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    resizable: true,
    backgroundColor: '#0f172aff',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  configWindow.on('closed', () => {
    configWindow = null;
  });

  loadRendererPage(configWindow, 'config');

  configWindow.once('ready-to-show', () => {
    configWindow?.show();
    configWindow?.focus();
  });

  return configWindow;
}

function openConfigWindow(): void {
  const window = createConfigWindow();
  if (window.isDestroyed()) {
    return;
  }
  if (!window.isVisible()) {
    window.show();
  }
  window.focus();
}

function createTray(): void {
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
    const window = createWindow();
    if (window.isVisible()) {
      requestRendererExitThen(() => window.hide());
    } else {
      window.webContents.send('app:will-show');
      window.show();
      window.focus();
    }
  };

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: toggleWindow,
    },
    {
      label: '打开配置窗口',
      click: () => {
        openConfigWindow();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

app.whenReady().then(async () => {
  try {
    const cfg = await loadAppConfig();
    const anyCfg: any = cfg as any;
    if (anyCfg?.petWindow?.scale && typeof anyCfg.petWindow.scale === 'number') {
      const scale = Math.max(0.5, Math.min(3, anyCfg.petWindow.scale));
      initialWindowSize = {
        width: Math.round(BASE_WINDOW.width * scale),
        height: Math.round(BASE_WINDOW.height * scale),
      };
    }
  } catch (err) {
    console.warn('[main] Failed to load window size from config, using defaults.', err);
  }

  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(resolveAssetPath('icons', 'logo.png'));
    app.dock.setIcon(dockIcon);
    app.dock.hide();
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.cxorz.tana');
  }

  createTray();
  createWindow();
  initializeReminderScheduler();

  app.on('activate', function () {
    const window = createWindow();
    window.webContents.send('app:will-show');
    window.show();
    window.focus();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  reminderScheduler?.stop();
});

app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('execute-command', async (_, command: string) => {
  try {
    console.log(`执行命令: ${command}`);
    return { success: true, command, note: '命令已记录，实际执行需要额外的安全措施' };
  } catch (error) {
    console.error('Execute command failed:', error);
    throw error;
  }
});

ipcMain.handle('config:load', async () => {
  const config = await loadAppConfig();
  return config;
});

ipcMain.handle('config:save', async (_event, config: AppConfig) => {
  const persisted = await saveAppConfig(config);

  try {
    ensureScheduler().start(persisted);
  } catch (error) {
    console.error('[config] 更新调度器失败', error);
  }

  try {
    const anyCfg: any = persisted as any;
    if (anyCfg?.petWindow?.scale && typeof anyCfg.petWindow.scale === 'number') {
      const scale = Math.max(0.5, Math.min(3, anyCfg.petWindow.scale));
      initialWindowSize = {
        width: Math.round(BASE_WINDOW.width * scale),
        height: Math.round(BASE_WINDOW.height * scale),
      };
      const win = createWindow();
      if (!win.isDestroyed()) {
        win.setContentSize(initialWindowSize.width, initialWindowSize.height);
      }
    }
  } catch (error) {
    console.warn('[config] 应用窗口尺寸失败', error);
  }

  return persisted;
});

ipcMain.handle('config:open', async () => {
  openConfigWindow();
});

ipcMain.handle('notify:system', async (_event, payload: ReminderPayload) => {
  try {
    await maybeShowSystemNotification(payload, () => {
      const win = createWindow();
      if (!win.isDestroyed()) {
        win.webContents.send('app:will-show');
        win.show();
        win.focus();
      }
    });
  } catch (err) {
    console.warn('[notify] Failed to show system notification (renderer request)', err);
  }
});

async function initializeReminderScheduler(): Promise<void> {
  try {
    const config = await loadAppConfig();
    ensureScheduler().start(config);
  } catch (error) {
    console.error('[main] 初始化提醒调度器失败', error);
  }
}

function ensureScheduler(): ReminderScheduler {
  if (!reminderScheduler) {
    reminderScheduler = new ReminderScheduler((payload) => {
      const window = createWindow();
      if (!window || window.isDestroyed()) {
        return;
      }
      maybeShowSystemNotification(payload, () => {
        const win = createWindow();
        if (!win.isDestroyed()) {
          win.webContents.send('app:will-show');
          win.show();
          win.focus();
        }
      }).catch((err) => {
        console.warn('[notify] Failed to show system notification', err);
      });
      window.webContents.send('reminder:push', payload);
    });
  }
  return reminderScheduler;
}

function requestRendererExitThen(action: () => void) {
  const win = createWindow();
  if (!win || win.isDestroyed()) {
    action();
    return;
  }
  let done = false;
  const onAck = (e: Electron.IpcMainEvent) => {
    if (done) return;
    if (e.sender === win.webContents) {
      done = true;
      ipcMain.removeListener('app:hide-ack', onAck);
      action();
    }
  };
  ipcMain.on('app:hide-ack', onAck);
  win.webContents.send('app:will-hide');
}
