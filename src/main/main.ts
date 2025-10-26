import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { loadAppConfig } from './config';
import { ReminderScheduler } from './reminderScheduler';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let reminderScheduler: ReminderScheduler | null = null;

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
      mainWindow?.hide();
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
    mainWindow?.show();
  });

  const devServerUrl = resolveRendererEntry();
  if (devServerUrl) {
    // Electron Forge/Vite 在开发模式下注入地址，可避免硬编码端口。
    mainWindow.loadURL(devServerUrl);
  } else if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
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
      window.hide();
    } else {
      window.show();
      window.focus();
    }
  };

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: toggleWindow
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
