import type { ReminderModuleKey, ReminderPayload } from '../shared';
import { AppConfig, ReminderMessage, ReminderModule } from './config';
import { calculateWorkdayProgress } from './utils';

/**
 * 基础提醒模块的状态。
 * @interface ModuleState
 * @property {number} elapsedMinutes - 自上次触发以来经过的分钟数。
 * @property {number} dailyTotalMinutes - 当天累计的分钟数。
 * @property {number} [lastTriggerAt] - 上次触发的时间戳。
 * @property {number} [nextAvailableAt] - 下次可触发的最早时间戳 (用于冷却)。
 */
interface ModuleState {
  elapsedMinutes: number;
  dailyTotalMinutes: number;
  lastTriggerAt?: number;
  nextAvailableAt?: number;
}

type SendReminderFn = (payload: ReminderPayload) => void;

/**
 * 负责根据配置定时推送提醒的轻量调度器。
 * 所有模块共享统一的 tick 间隔，通过增量时间累计、冷却窗口等状态字段来决定是否触发。
 */
export class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private config: AppConfig | null = null;
  private moduleStates: Partial<Record<ReminderModuleKey, ModuleState>> = {};
  private lastTickAt = Date.now();
  private currentDayStamp = getDayStamp(new Date());

  constructor(private readonly sendReminder: SendReminderFn) { }

  start(config: AppConfig): void {
    this.stop();
    this.config = config;
    this.moduleStates = {};
    this.lastTickAt = Date.now();
    this.currentDayStamp = getDayStamp(new Date());

    const intervalMinutes = Math.max(config.baseIntervalMinutes || 1, 1);
    const intervalMs = intervalMinutes * 60 * 1000;

    this.timer = setInterval(() => this.tick(), intervalMs);
    this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    if (!this.config) return;

    const now = Date.now();
    const deltaMinutes = Math.max((now - this.lastTickAt) / 60000, 0);
    this.lastTickAt = now;

    if (getDayStamp(new Date(now)) !== this.currentDayStamp) {
      this.resetDailyStates();
      this.currentDayStamp = getDayStamp(new Date(now));
    }

    for (const key of Object.keys(this.config.reminders) as ReminderModuleKey[]) {
      this._processModule(key, deltaMinutes, now);
    }
  }

  private _processModule(key: ReminderModuleKey, deltaMinutes: number, now: number): void {
    if (!this.config) return;

    const moduleConfig = this.config.reminders[key];
    if (!moduleConfig.enabled) return;

    if (!this.moduleStates[key]) {
      this.moduleStates[key] = this.createInitialStateForModule();
    }

    const state = this.moduleStates[key]!;
    state.elapsedMinutes += deltaMinutes;
    state.dailyTotalMinutes = (state.dailyTotalMinutes || 0) + deltaMinutes;

    if (state.nextAvailableAt && now < state.nextAvailableAt) return;
    if (!this.shouldTriggerModule(moduleConfig, state)) return;

    const message = pickMessage(moduleConfig.messages);
    if (!message) return;

    const context = this.buildContextForModule(state, now, message);
    const renderedText = interpolate(message.text, context);

    this.sendReminder({
      module: key,
      messageId: message.id,
      text: renderedText,
      timestamp: now,
      context,
    });

    state.lastTriggerAt = now;
    const cooldownMinutes = moduleConfig.cooldownMinutes ?? moduleConfig.defaultIntervalMinutes;
    state.nextAvailableAt = now + cooldownMinutes * 60 * 1000;
    state.elapsedMinutes = 0;
  }

  private shouldTriggerModule(moduleConfig: ReminderModule, state: ModuleState): boolean {
    // For now, only timeElapsed is supported.
    const timeElapsedTrigger = moduleConfig.triggers.find((t) => t.type === 'timeElapsed');
    if (timeElapsedTrigger?.thresholdMinutes) {
      return state.elapsedMinutes >= timeElapsedTrigger.thresholdMinutes;
    }
    // Default to trigger if no valid triggers are defined
    return true;
  }

  private buildContextForModule(
    state: ModuleState,
    now: number,
    message: ReminderMessage
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {
      timestamp: now,
      dailyTotalMinutes: Math.floor(state.dailyTotalMinutes),
    };

    if (message.type === 'salary' && this.config?.workDay && message.targetEarnSalary) {
      const progress = calculateWorkdayProgress(this.config.workDay, now);
      context.earnedMoney = (progress * message.targetEarnSalary).toFixed(2);
    }

    return context;
  }

  private createInitialStateForModule(): ModuleState {
    return {
      elapsedMinutes: 0,
      dailyTotalMinutes: 0,
    };
  }

  private resetDailyStates(): void {
    Object.values(this.moduleStates).forEach((state) => {
      if (state) {
        state.elapsedMinutes = 0;
        state.dailyTotalMinutes = 0;
        state.lastTriggerAt = undefined;
        state.nextAvailableAt = undefined;
      }
    });
  }
}

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function pickMessage(messages: ReminderMessage[]): ReminderMessage | undefined {
  if (!messages || messages.length === 0) return undefined;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

function getDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
