import { Notification } from 'electron';
import type { JournalDay, JournalSummary } from '../../../shared';
import type { AppConfig } from '../config/config';
import { resolveAssetPath } from '../../lib/utils';
import { getAIJournalSummary } from './journalSummary';
import { getDayStamp, loadJournalDay, setJournalSummary } from './journalStore';

export class JournalScheduler {
  private timer: NodeJS.Timeout | null = null;
  private config: AppConfig | null = null;
  private lastNotifiedDay: string | null = null;

  /**
   * 创建 JournalScheduler。
   */
  constructor(private readonly handleClickNotification: () => void) {}

  /**
   * 启动或重启调度器。
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
    const day = await loadJournalDay(dayStamp); // 当天日志数据
    const summary = await this.getSummary(day, dayStamp); // 获取或生成回顾
    this.showSummaryNotification(day, summary); // 推送通知
  }

  /**
   * 推送回顾今日通知
   */
  private showSummaryNotification(day: JournalDay, summary?: JournalSummary | null): void {
    const iconPath =
      process.platform === 'win32'
        ? resolveAssetPath('icons', 'logo.ico')
        : resolveAssetPath('icons', 'logo.png');

    const title = summary?.title || 'Yohoo~';
    const body =
      summary?.description ||
      (day.entries.length > 0
        ? `准备下班啦，快来回顾一下今天吧~`
        : '今天没有记录哦~ 要看看之前的回顾嘛?');

    const notif = new Notification({ title, body, icon: iconPath });

    notif.on('click', () => {
      this.handleClickNotification();
    });

    notif.show();
  }

  /**
   * 尝试生成并保存当日的 AI 日报摘要;
   */
  private async getSummary(day: JournalDay, dayStamp: string): Promise<JournalSummary | undefined> {
    const entryTotal = day.summary?.entryTotal;
    const summaryUpToDate = typeof entryTotal === 'number' && entryTotal === day.entries.length;
    // 记录没有新增，无需再生成
    if (summaryUpToDate) return day.summary;

    const summary = await getAIJournalSummary(day, this.config?.ai);
    if (summary) {
      return setJournalSummary(dayStamp, summary);
    }
    return;
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
