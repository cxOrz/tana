import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { loadAppConfig, saveAppConfig, type AppConfig } from './config';
import { ReminderScheduler } from './reminderScheduler';

let mainWindow: BrowserWindow | null = null;
let configWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let reminderScheduler: ReminderScheduler | null = null;

// Windows: disable DWM window animations to avoid flicker; keep others unchanged
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('wm-window-animations-disabled');
}

const resolveAssetPath = (...paths: string[]): string => {
  const assetsBase = app.isPackaged ? join(process.resourcesPath, 'assets') : join(__dirname, '../../assets');
  return join(assetsBase, ...paths);
};

const resolveRendererEntry = (): string | null => {
  return (
    process.env.VITE_DEV_SERVER_URL ??
    process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL ??
    null
  );
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

  const windowIcon = process.platform === 'win32' ? resolveAssetPath('icons', 'logo.ico') : resolveAssetPath('icons', 'logo.png');

  mainWindow = new BrowserWindow({
    width: 450,
    height: 360,
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
      backgroundThrottling: false
    }
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
      backgroundThrottling: false
    }
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

  const trayIconPath = process.platform === 'win32' ? resolveAssetPath('icons', 'logo.ico') : resolveAssetPath('icons', 'logo.png');
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
      click: toggleWindow
    },
    {
      label: '打开配置窗口',
      click: () => {
        openConfigWindow();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

app.whenReady().then(() => {
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

// 执行系统命令
ipcMain.handle('execute-command', async (_, command: string) => {
  try {
    console.log(`执行命令: ${command}`);

    // 出于安全考虑，这里只是记录命令，不实际执行
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

  return persisted;
});

ipcMain.handle('config:open', async () => {
  openConfigWindow();
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
      window.webContents.send('reminder:push', payload);
    });
  }
  return reminderScheduler;
}
// Before hiding, ask renderer to play exit transition, then proceed
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
