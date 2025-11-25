import type { ReminderModuleKey, ReminderPayload } from '../shared';
import { AppConfig, ReminderMessage, ReminderModule } from './config';

/**
 * 基础提醒模块的状态。
 * @interface ModuleState
 * @property {number} elapsedMinutes - 自上次触发以来经过的分钟数。
 * @property {number} [lastTriggerAt] - 上次触发的时间戳。
 * @property {number} [nextAvailableAt] - 下次可触发的最早时间戳 (用于冷却)。
 */
interface ModuleState {
  elapsedMinutes: number;
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

  /**
   * 创建一个 ReminderScheduler 实例。
   * @param {SendReminderFn} sendReminder - 用于发送提醒的回调函数。
   */
  constructor(private readonly sendReminder: SendReminderFn) {}

  /**
   * 启动调度器。
   * @param {AppConfig} config - 应用配置。
   */
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

  /**
   * 停止调度器。
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 执行一次调度循环 (tick)。
   * @private
   */
  private tick(): void {
    if (!this.config) {
      return;
    }

    const now = Date.now();
    const deltaMinutes = Math.max((now - this.lastTickAt) / 60000, 0);
    this.lastTickAt = now;

    const currentStamp = getDayStamp(new Date(now));
    if (currentStamp !== this.currentDayStamp) {
      this.resetDailyStates();
      this.currentDayStamp = currentStamp;
    }

    for (const key of Object.keys(this.config.reminders) as ReminderModuleKey[]) {
      const moduleConfig = this.config.reminders[key];
      if (!moduleConfig.enabled) {
        continue;
      }

      if (!this.moduleStates[key]) {
        this.moduleStates[key] = this.createInitialStateForModule();
      }

      const state = this.moduleStates[key]!;
      state.elapsedMinutes += deltaMinutes;

      if (state.nextAvailableAt && now < state.nextAvailableAt) {
        continue;
      }

      const shouldFire = this.shouldTriggerModule(moduleConfig, state);
      if (!shouldFire) {
        continue;
      }

      const message = pickMessage(moduleConfig.messages);
      if (!message) {
        continue;
      }

      const context = this.buildContextForModule(moduleConfig, state, deltaMinutes, now);
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
  }

  /**
   * 判断一个模块是否应该被触发。
   * @private
   * @param {ReminderModule} moduleConfig - 模块的配置。
   * @param {ModuleState} state - 模块的当前状态。
   * @returns {boolean} 如果模块应该被触发，则返回 true。
   */
  private shouldTriggerModule(moduleConfig: ReminderModule, state: ModuleState): boolean {
    const triggers = moduleConfig.triggers ?? [];
    let triggered = triggers.length === 0;

    for (const trigger of triggers) {
      switch (trigger.type) {
        case 'timeElapsed': {
          if (trigger.thresholdMinutes === undefined) {
            break;
          }
          if (state.elapsedMinutes >= trigger.thresholdMinutes) {
            triggered = true;
          }
          break;
        }
        default:
          break;
      }

      if (triggered) {
        break;
      }
    }

    return triggered;
  }

  /**
   * 为模块构建模板上下文。
   * @private
   */
  private buildContextForModule(
    _moduleConfig: ReminderModule,
    _state: ModuleState,
    deltaMinutes: number,
    now: number
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {
      deltaMinutes: Number(deltaMinutes.toFixed(2)),
      timestamp: now,
    };

    return context;
  }

  /**
   * 为指定模块创建初始状态。
   * @private
   */
  private createInitialStateForModule(): ModuleState {
    return {
      elapsedMinutes: 0,
    };
  }

  /**
   * 在跨天时重置所有模块的每日状态。
   * @private
   */
  private resetDailyStates(): void {
    for (const state of Object.values(this.moduleStates) as ModuleState[]) {
      state.elapsedMinutes = 0;
      state.lastTriggerAt = undefined;
      state.nextAvailableAt = undefined;
    }
  }
}

/**
 * 使用给定的上下文替换模板字符串中的占位符。
 * @param {string} template - 模板字符串 (例如 "Hello, {{ name }}!")。
 * @param {Record<string, unknown>} context - 包含替换值的对象。
 * @returns {string} 替换后的字符串。
 */
function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

/**
 * 根据权重从消息列表中随机选择一条消息。
 * @param {ReminderMessage[]} messages - 消息列表。
 * @returns {ReminderMessage | undefined} 选中的消息或 undefined。
 */
function pickMessage(messages: ReminderMessage[]): ReminderMessage | undefined {
  if (!messages || messages.length === 0) return undefined;
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

/**
 * 获取日期的 "YYYY-M-D" 格式字符串。
 * @param {Date} date - 日期对象。
 * @returns {string} 日期戳字符串。
 */
function getDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
