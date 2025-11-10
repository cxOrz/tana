import { Notification, app } from 'electron';
import { join } from 'path';
import { loadAppConfig, type AppConfig } from '../config';
import type { ReminderModuleKey } from '../../shared/reminderTypes';
import type { ReminderPayload } from '../../shared';

const moduleTitle = (key: ReminderModuleKey): string => {
  switch (key) {
    case 'progress':
      return '专注提醒';
    case 'income':
      return '收益提醒';
    case 'wellness':
      return '健康提醒';
    case 'surprise':
      return '小惊喜';
    default:
      return 'Tana 提醒';
  }
};

const resolveAssetPath = (...paths: string[]): string => {
  const assetsBase = app.isPackaged
    ? join(process.resourcesPath, 'assets')
    : join(__dirname, '../../../assets');
  return join(assetsBase, ...paths);
};

export async function maybeShowSystemNotification(
  payload: ReminderPayload,
  onClickShowWindow: () => void
): Promise<void> {
  let cfg: AppConfig | null = null;
  try {
    cfg = await loadAppConfig();
  } catch {
    cfg = null;
  }
  if (!cfg?.notifications?.systemEnabled) return;

  const iconPath =
    process.platform === 'win32'
      ? resolveAssetPath('icons', 'logo.ico')
      : resolveAssetPath('icons', 'logo.png');

  const notif = new Notification({
    title: moduleTitle(payload.module as ReminderModuleKey),
    body: payload.text,
    icon: iconPath,
    silent: !!cfg?.notifications?.silent,
  });
  notif.on('click', () => {
    try {
      onClickShowWindow();
    } catch {}
  });
  notif.show();
}

export { moduleTitle };
