import { Notification } from 'electron';
import { loadAppConfig } from '../config';
import type { ReminderModuleKey } from '../../shared/reminderTypes';
import type { ReminderPayload } from '../../shared';
import { resolveAssetPath } from '../utils';

/**
 * 根据提醒模块的键名返回对应的中文标题。
 * @param {ReminderModuleKey} key - 提醒模块的键名。
 * @returns {string} 模块的中文标题。
 */
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

/**
 * 根据应用配置决定是否显示一个系统通知。
 * @param {ReminderPayload} payload - 提醒的数据负载。
 * @param {() => void} onClickShowWindow - 当通知被点击时调用的回调函数，通常用于显示主窗口。
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
