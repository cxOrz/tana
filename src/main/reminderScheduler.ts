import type { ReminderModuleKey, ReminderPayload } from '../shared';
import {
  AppConfig,
  IncomeReminderModule,
  ReminderMessage,
  ReminderModule,
  SurpriseModule,
} from './config';

/**
 * 基础提醒模块的状态。
 * @interface BaseModuleState
 * @property {number} elapsedMinutes - 自上次触发以来经过的分钟数。
 * @property {number} [lastTriggerAt] - 上次触发的时间戳。
 * @property {number} [nextAvailableAt] - 下次可触发的最早时间戳 (用于冷却)。
 */
interface BaseModuleState {
  elapsedMinutes: number;
  lastTriggerAt?: number;
  nextAvailableAt?: number;
}

/**
 * 收入提醒模块的特定状态。
 * @interface IncomeModuleState
 * @extends {BaseModuleState}
 * @property {number} workedMinutesToday - 今天已工作的分钟数。
 * @property {number} incomeToday - 今天预估的收入。
 */
interface IncomeModuleState extends BaseModuleState {
  workedMinutesToday: number;
  incomeToday: number;
}

/**
 * 惊喜提醒模块的特定状态。
 * @interface SurpriseModuleState
 * @extends {BaseModuleState}
 * @property {{ earliest: number; latest: number }} [randomWindow] - 随机触发的时间窗口。
 */
interface SurpriseModuleState extends BaseModuleState {
  randomWindow?: {
    earliest: number;
    latest: number;
  };
}

type ModuleState = BaseModuleState | IncomeModuleState | SurpriseModuleState;

/**
 * 提醒调度器的运行时上下文。
 * @interface ReminderRuntimeContext
 * @property {Record<string, boolean>} [customFlags] - 用于 `custom` 类型触发器的自定义标志。
 */
export interface ReminderRuntimeContext {
  customFlags?: Record<string, boolean>;
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
  private runtimeContext: ReminderRuntimeContext = {};

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
   * 更新调度器的运行时上下文。
   * @param {Partial<ReminderRuntimeContext>} context - 要更新的部分上下文。
   */
  updateRuntimeContext(context: Partial<ReminderRuntimeContext>): void {
    this.runtimeContext = {
      ...this.runtimeContext,
      ...context,
    };
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
        this.moduleStates[key] = this.createInitialStateForModule(key);
      }

      const state = this.moduleStates[key]!;
      state.elapsedMinutes += deltaMinutes;

      if (key === 'income' && isIncomeModule(moduleConfig) && isIncomeState(state)) {
        this.applyIncomeProgress(moduleConfig, state, now, deltaMinutes);
      }

      if (state.nextAvailableAt && now < state.nextAvailableAt) {
        continue;
      }

      const shouldFire = this.shouldTriggerModule(key, moduleConfig, state, now);
      if (!shouldFire) {
        continue;
      }

      const message = pickMessage(moduleConfig.messages);
      if (!message) {
        continue;
      }

      const context = this.buildContextForModule(key, moduleConfig, state, deltaMinutes, now);
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

      if (isSurpriseModule(moduleConfig) && isSurpriseState(state)) {
        state.randomWindow = createRandomWindow(now, moduleConfig.randomStrategy);
      }
    }
  }

  /**
   * 判断一个模块是否应该被触发。
   * @private
   * @param {ReminderModuleKey} key - 模块的键。
   * @param {ReminderModule | IncomeReminderModule | SurpriseModule} moduleConfig - 模块的配置。
   * @param {ModuleState} state - 模块的当前状态。
   * @param {number} now - 当前的时间戳。
   * @returns {boolean} 如果模块应该被触发，则返回 true。
   */
  private shouldTriggerModule(
    key: ReminderModuleKey,
    moduleConfig: ReminderModule | IncomeReminderModule | SurpriseModule,
    state: ModuleState,
    now: number
  ): boolean {
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
        case 'idle': {
          break;
        }
        case 'custom': {
          if (trigger.id && this.runtimeContext.customFlags?.[trigger.id]) {
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

    if (isSurpriseModule(moduleConfig) && isSurpriseState(state)) {
      if (!triggered) {
        return false;
      }

      const window = state.randomWindow ?? createRandomWindow(now, moduleConfig.randomStrategy);
      state.randomWindow = window;

      if (now < window.earliest) {
        return false;
      }

      if (now >= window.latest) {
        return true;
      }

      const roll = Math.random();
      return roll <= moduleConfig.randomStrategy.probability;
    }

    return triggered;
  }

  /**
   * 为模块构建模板上下文。
   * @private
   */
  private buildContextForModule(
    key: ReminderModuleKey,
    _moduleConfig: ReminderModule | IncomeReminderModule | SurpriseModule,
    state: ModuleState,
    deltaMinutes: number,
    now: number
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {
      deltaMinutes: Number(deltaMinutes.toFixed(2)),
      timestamp: now,
    };

    if (key === 'income' && isIncomeState(state)) {
      const workedMinutes = state.workedMinutesToday;
      const incomeValue = state.incomeToday;
      context['income'] = incomeValue.toFixed(2);
      context['workedMinutes'] = workedMinutes;
    }

    return context;
  }

  /**
   * 更新收入模块的工作进度和收入。
   * @private
   */
  private applyIncomeProgress(
    moduleConfig: IncomeReminderModule,
    state: IncomeModuleState,
    now: number,
    deltaMinutes: number
  ): void {
    const activeMinutes = this.isWithinWorkWindow(now, moduleConfig) ? deltaMinutes : 0;
    state.workedMinutesToday += activeMinutes;
    const hourlyRate = moduleConfig.incomeConfig.hourlyRate || 0;
    state.incomeToday = (state.workedMinutesToday / 60) * hourlyRate;
  }

  /**
   * 检查当前时间是否在工作窗口内。
   * @private
   */
  private isWithinWorkWindow(timestamp: number, moduleConfig: IncomeReminderModule): boolean {
    const { workdayStart, workdayEnd } = moduleConfig.incomeConfig;
    const startMinutes = parseTimeToMinutes(workdayStart);
    const endMinutes = parseTimeToMinutes(workdayEnd);
    const currentDate = new Date(timestamp);
    const minutes = currentDate.getHours() * 60 + currentDate.getMinutes();
    if (startMinutes === undefined || endMinutes === undefined) {
      return true;
    }
    if (endMinutes >= startMinutes) {
      return minutes >= startMinutes && minutes < endMinutes;
    }
    return minutes >= startMinutes || minutes < endMinutes;
  }

  /**
   * 为指定模块创建初始状态。
   * @private
   */
  private createInitialStateForModule(key: ReminderModuleKey): ModuleState {
    if (key === 'income') {
      return {
        elapsedMinutes: 0,
        workedMinutesToday: 0,
        incomeToday: 0,
      } as IncomeModuleState;
    }

    if (key === 'surprise') {
      return {
        elapsedMinutes: 0,
        randomWindow: undefined,
      } as SurpriseModuleState;
    }

    return {
      elapsedMinutes: 0,
    };
  }

  /**
   * 在跨天时重置所有模块的每日状态。
   * @private
   */
  private resetDailyStates(): void {
    for (const [key, state] of Object.entries(this.moduleStates) as [
      ReminderModuleKey,
      ModuleState,
    ][]) {
      state.elapsedMinutes = 0;
      state.lastTriggerAt = undefined;
      state.nextAvailableAt = undefined;

      if (key === 'income' && isIncomeState(state)) {
        state.workedMinutesToday = 0;
        state.incomeToday = 0;
      }

      if (key === 'surprise' && isSurpriseState(state)) {
        state.randomWindow = undefined;
      }
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
  if (!messages || messages.length === 0) {
    return undefined;
  }

  const totalWeight = messages.reduce((sum, msg) => sum + (msg.weight ?? 1), 0);
  const threshold = Math.random() * totalWeight;

  let cumulative = 0;
  for (const message of messages) {
    cumulative += message.weight ?? 1;
    if (threshold <= cumulative) {
      return message;
    }
  }

  return messages[0];
}

/**
 * 为惊喜模块创建一个随机的时间窗口。
 * @param {number} now - 当前的时间戳。
 * @param {SurpriseModule['randomStrategy']} strategy - 随机策略配置。
 * @returns {{ earliest: number; latest: number }} 触发时间窗口。
 */
function createRandomWindow(
  now: number,
  strategy: SurpriseModule['randomStrategy']
): { earliest: number; latest: number } {
  const { minIntervalMinutes, maxIntervalMinutes } = strategy;
  const minMs = Math.max(minIntervalMinutes, 1) * 60 * 1000;
  const maxMs = Math.max(maxIntervalMinutes, minIntervalMinutes) * 60 * 1000;
  const earliest = now + minMs;
  const latest = now + maxMs;
  return { earliest, latest };
}

/**
 * 将 "HH:mm" 格式的时间字符串解析为从午夜开始的分钟数。
 * @param {string | undefined} value - 时间字符串。
 * @returns {number | undefined} 分钟数或 undefined。
 */
function parseTimeToMinutes(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const [hours, minutes] = value.split(':').map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return undefined;
  }
  return hours * 60 + minutes;
}

/**
 * 获取日期的 "YYYY-M-D" 格式字符串。
 * @param {Date} date - 日期对象。
 * @returns {string} 日期戳字符串。
 */
function getDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// Type guards to narrow down module and state types
function isIncomeModule(
  module: ReminderModule | IncomeReminderModule | SurpriseModule
): module is IncomeReminderModule {
  return (module as IncomeReminderModule).incomeConfig !== undefined;
}

function isSurpriseModule(
  module: ReminderModule | IncomeReminderModule | SurpriseModule
): module is SurpriseModule {
  return (module as SurpriseModule).randomStrategy !== undefined;
}

function isIncomeState(state: ModuleState): state is IncomeModuleState {
  return (state as IncomeModuleState).workedMinutesToday !== undefined;
}

function isSurpriseState(state: ModuleState): state is SurpriseModuleState {
  return Object.hasOwn(state, 'randomWindow');
}
