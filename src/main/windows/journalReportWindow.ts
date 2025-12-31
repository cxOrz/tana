import { BrowserWindow } from 'electron';
import { join } from 'path';
import { IPC_CHANNELS } from '../../shared/constants';
import { loadRendererPage } from './shared';

let journalReportWindow: BrowserWindow | null = null;

/**
 * 创建日报窗口。
 */
export function createJournalReportWindow(): BrowserWindow {
  if (journalReportWindow) return journalReportWindow;

  journalReportWindow = new BrowserWindow({
    width: 720,
    height: 860,
    resizable: true,
    autoHideMenuBar: true,
    frame: true,
    show: false,
    backgroundColor: '#020617',
    webPreferences: {
      preload: join(__dirname, '../preload.js'),
    },
  });

  journalReportWindow.on('closed', () => {
    journalReportWindow = null;
  });

  journalReportWindow.on('close', (event) => {
    event.preventDefault();
    journalReportWindow?.hide();
  });

  loadRendererPage(journalReportWindow, '/journal');

  journalReportWindow.once('ready-to-show', () => {
    journalReportWindow?.show();
    journalReportWindow?.focus();
  });

  return journalReportWindow;
}

/**
 * 打开日报窗口。
 * @param {string} [dayStamp] - 指定日期，默认当天。
 */
export function openJournalReport(dayStamp?: string): void {
  const win = createJournalReportWindow();
  if (!win.isFocused()) {
    win.show();
    win.focus();
  }

  const sendDay = () => win.webContents.send(IPC_CHANNELS.JOURNAL_OPEN_REPORT, dayStamp);
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', sendDay);
  } else {
    sendDay();
  }
}
