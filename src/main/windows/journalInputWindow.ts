import { BrowserWindow } from 'electron';
import { join } from 'path';
import { loadRendererPage } from './shared';

let journalInputWindow: BrowserWindow | null = null;

/**
 * 创建快速输入窗口。
 */
export function createJournalInputWindow(): BrowserWindow {
  if (journalInputWindow) return journalInputWindow;

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
      preload: join(__dirname, '../preload.js'),
    },
  });

  journalInputWindow.on('closed', () => {
    journalInputWindow = null;
  });

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
