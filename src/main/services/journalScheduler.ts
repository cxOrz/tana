import { Notification } from 'electron';
import type { JournalDay } from '../../shared';
import type { AppConfig } from '../config';
import { loadJournalDay, setJournalSummary } from './journalStore';
import { resolveAssetPath } from '../utils';
import { getDayStamp } from './journalStore';
import { generateJournalSummary } from './journalSummary';

/**
 * @file journalScheduler.ts
 * @description
 * 负责在每日指定时间推送日志日报提醒，并在点击通知时打开日报窗口。
 */
export class JournalScheduler {
  private timer: NodeJS.Timeout | null = null;
  private config: AppConfig | null = null;
  private lastNotifiedDay: string | null = null;

  /**
   * 创建 JournalScheduler。
   * @param {() => void} onOpenReport - 当用户点击通知时打开日报窗口的回调。
   */
  constructor(private readonly onOpenReport: () => void) {}

  /**
   * 启动或重启调度器。
   * @param {AppConfig} cfg - 应用配置。
   */
  start(cfg: AppConfig): void {
    this.stop();
    this.config = cfg;
    this.lastNotifiedDay = null;
    this.timer = setInterval(() => this.tick(), 60 * 1000);
    this.tick();
  }

  /**
   * 停止调度器。
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (!this.config?.journal?.notifyEnabled) return;
    if (this.config.notifications && this.config.notifications.systemEnabled === false) {
      return;
    }
    const now = new Date();
    const dayStamp = getDayStamp(now);
    const targetMinutes = parseTimeToMinutes(this.config.journal.dailyReportTime);
    if (targetMinutes === null) return;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (currentMinutes < targetMinutes) {
      return;
    }

    if (this.lastNotifiedDay === dayStamp) {
      return;
    }

    this.lastNotifiedDay = dayStamp;
    const day = await loadJournalDay(dayStamp);
    await this.maybeGenerateSummary(day, dayStamp);
    const count = day.entries.length;
    this.showNotification(count);
  }

  private showNotification(count: number): void {
    const iconPath =
      process.platform === 'win32'
        ? resolveAssetPath('icons', 'logo.ico')
        : resolveAssetPath('icons', 'logo.png');

    const notif = new Notification({
      title: '今日日志',
      body: count > 0 ? `今天记录了 ${count} 条内容，点击查看摘要` : '今天还没有记录，点击补充一下吧',
      icon: iconPath,
      silent: !this.config?.notifications?.systemEnabled ? true : this.config?.notifications?.silent,
    });

    notif.on('click', () => {
      try {
        this.onOpenReport();
      } catch (error) {
        console.warn('[journal] 打开日报窗口失败', error);
      }
    });

    try {
      notif.show();
    } catch (error) {
      console.warn('[journal] 显示日报通知失败', error);
    }
  }

  /**
   * 尝试生成并保存当日的 AI 日报摘要。
   */
  private async maybeGenerateSummary(day: JournalDay, dayStamp: string): Promise<void> {
    if (!this.config?.ai) return;
    try {
      const summary = await generateJournalSummary(day, this.config);
      if (summary) {
        await setJournalSummary(dayStamp, summary);
      }
    } catch (error) {
      console.warn('[journal] 生成日报摘要失败', error);
    }
  }
}

/**
 * 将 "HH:mm" 转换为分钟数。
 * @param {string | undefined} value - 时间字符串。
 * @returns {number | null} 分钟数。
 */
function parseTimeToMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const [h, m] = value.split(':').map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
