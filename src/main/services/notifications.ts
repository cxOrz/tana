import { Notification } from 'electron';
import { loadAppConfig } from '../config';
import type { ReminderPayload } from '../../shared';
import { resolveAssetPath } from '../utils';

const DEFAULT_TITLE = 'Yoho~';

/**
 * 根据应用配置决定是否显示一个系统通知。
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
    title: DEFAULT_TITLE,
    body: payload.text,
    icon: iconPath,
  });
  notif.on('click', () => {
    try {
      onClickShowWindow();
    } catch {}
  });
  notif.show();
}
