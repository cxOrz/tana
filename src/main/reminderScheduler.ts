import type { ReminderModuleKey, ReminderPayload } from '../shared';
import { AppConfig, ReminderMessage, ReminderModule } from './config';
import { calculateWorkdayProgress } from './utils';

interface ModuleState {
  elapsedMinutes: number; // 距上次触发的分钟数
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

  constructor(private readonly sendReminder: SendReminderFn) {}

  /** 启动调度器并立即执行一次 tick */
  start(config: AppConfig): void {
    this.stop();
    this.config = config;
    this.moduleStates = {};
    this.lastTickAt = Date.now();
    this.currentDayStamp = getDayStamp(new Date());

    // 统一使用基础轮询间隔驱动所有提醒模块。
    const intervalMinutes = Math.max(config.baseIntervalMinutes || 1, 1);
    const intervalMs = intervalMinutes * 60 * 1000;

    this.timer = setInterval(() => this.tick(), intervalMs);
    this.tick();
  }

  /** 停止调度器 */
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

    this.resetIfNewDay(now); // 过24点重置状态
    this.processModules(deltaMinutes, now); // 处理每个模块
  }

  // 过24点重置状态
  private resetIfNewDay(now: number): void {
    const dayStamp = getDayStamp(new Date(now));
    if (dayStamp > this.currentDayStamp) {
      this.resetDailyStates();
      this.currentDayStamp = dayStamp;
    }
  }

  // 处理 reminder 的每个模块，如 daily
  private processModules(deltaMinutes: number, now: number): void {
    if (!this.config) return;
    for (const key of Object.keys(this.config.reminders) as ReminderModuleKey[]) {
      this.processModule(key, deltaMinutes, now);
    }
  }

  // 处理一个模块
  private processModule(key: ReminderModuleKey, deltaMinutes: number, now: number): void {
    if (!this.config) return;

    const moduleConfig = this.config.reminders[key];
    if (!moduleConfig.enabled) return;

    const state = this.getModuleState(key);
    this.updateStateWithDelta(state, deltaMinutes); // 更新模块运行状态

    // 还未到触发时间
    if (!this.reachedTriggerTime(moduleConfig, state)) return;

    // 选一条预设消息
    const message = pickMessage(moduleConfig.messages);
    if (!message) return;

    const context = this.buildContextForModule(now, message);
    const renderedText = interpolate(message.text, context);

    this.sendReminder({
      module: key,
      messageId: message.id,
      text: renderedText,
      timestamp: now,
      context,
    });

    state.elapsedMinutes = 0;
  }

  // 获取模块当前状态
  private getModuleState(key: ReminderModuleKey): ModuleState {
    // 如果集合中还没有当前模块，则初始化一个
    if (!this.moduleStates[key]) {
      this.moduleStates[key] = this.initModuleState(); // 设置初始值
    }
    return this.moduleStates[key]!;
  }

  // 更新模块运行状态
  private updateStateWithDelta(state: ModuleState, deltaMinutes: number): void {
    state.elapsedMinutes += deltaMinutes; // 更新距离上次触发的时间
  }

  // 已过触发时间
  private reachedTriggerTime(moduleConfig: ReminderModule, state: ModuleState): boolean {
    return state.elapsedMinutes >= moduleConfig.defaultIntervalMinutes;
  }

  // 构建参数
  private buildContextForModule(now: number, message: ReminderMessage): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    if (message.type === 'salary' && this.config?.workDay && message.targetEarnSalary) {
      const progress = calculateWorkdayProgress(this.config.workDay, now);
      context.earnedMoney = (progress * message.targetEarnSalary).toFixed(2);
    }

    return context;
  }

  // 重置当日所有模块状态
  private resetDailyStates(): void {
    Object.keys(this.moduleStates).forEach((key) => {
      const moduleKey = key as ReminderModuleKey;
      if (this.moduleStates[moduleKey]) {
        this.moduleStates[moduleKey] = this.initModuleState();
      }
    });
  }

  // 重置模块状态
  private initModuleState(): ModuleState {
    return { elapsedMinutes: 0 };
  }
}

// 填充消息占位符
function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

// 选一条消息
function pickMessage(messages: ReminderMessage[]): ReminderMessage | undefined {
  if (!messages || messages.length === 0) return undefined;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

// 获取当天0点时间戳
function getDayStamp(date: Date): number {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.getTime();
}
