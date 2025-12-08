import { Notification } from 'electron';
import { loadAppConfig } from '../config';
import type { ReminderModuleKey } from '../../shared/reminderTypes';
import type { ReminderPayload } from '../../shared';
import { resolveAssetPath } from '../utils';

/**
 * 根据提醒模块的键名返回对应的中文标题。
 */
const moduleTitle = (key: ReminderModuleKey): string => {
  switch (key) {
    case 'daily':
      return '日常提醒';
    default:
      return 'Tana 提醒';
  }
};

/**
 * 根据应用配置决定是否显示一个系统通知。
 * @returns {Promise<void>}
 */
export async function maybeShowSystemNotification(
  payload: ReminderPayload,
  onClickShowWindow: () => void
): Promise<void> {
  let cfg;
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
