import { ipcMain } from 'electron';
import type { ReminderPayload } from '../shared';
import { IPC_CHANNELS } from '../shared/constants';
import { getMainWindow } from './windowManager';
import { maybeShowSystemNotification } from './services/notifications';
import {
  appendJournalEntry,
  listJournalDays,
  loadJournalDay,
  setJournalSummary,
} from './services/journalStore';
import { createJournalReportWindow } from './windowManager';

/**
 * 注册所有的 IPC 事件处理程序。
 */
export function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.SHOW_SYSTEM_NOTIFICATION,
    async (_event, payload: ReminderPayload) => {
      try {
        await maybeShowSystemNotification(payload, () => {
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.WILL_SHOW);
            win.show();
            win.focus();
          }
        });
      } catch (err) {
        console.warn('[notify] Failed to show system notification (renderer request)', err);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.JOURNAL_ADD_ENTRY, async (_event, input) => {
    return appendJournalEntry(input);
  });

  ipcMain.handle(IPC_CHANNELS.JOURNAL_GET_DAY, async (_event, dayStamp?: string) => {
    const date = dayStamp || getTodayStamp();
    return loadJournalDay(date);
  });

  ipcMain.handle(IPC_CHANNELS.JOURNAL_LIST_DAYS, async (_event, limit?: number) => {
    return listJournalDays(limit);
  });

  ipcMain.handle(IPC_CHANNELS.JOURNAL_SET_SUMMARY, async (_event, dayStamp: string, summary) => {
    const date = dayStamp || getTodayStamp();
    return setJournalSummary(date, summary);
  });

  ipcMain.handle(IPC_CHANNELS.JOURNAL_OPEN_REPORT, async (_event, dayStamp?: string) => {
    const win = createJournalReportWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.JOURNAL_OPEN_REPORT, dayStamp || getTodayStamp());
      win.show();
      win.focus();
    }
  });
}

function getTodayStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}
