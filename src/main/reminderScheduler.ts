import type { ReminderModuleKey, ReminderPayload } from '../shared';
import { AppConfig, IncomeReminderModule, ReminderMessage, ReminderModule, SurpriseModule } from './config';

interface BaseModuleState {
  elapsedMinutes: number;
  lastTriggerAt?: number;
  nextAvailableAt?: number;
}

interface IncomeModuleState extends BaseModuleState {
  workedMinutesToday: number;
  incomeToday: number;
}

interface SurpriseModuleState extends BaseModuleState {
  randomWindow?: {
    earliest: number;
    latest: number;
  };
}

type ModuleState = BaseModuleState | IncomeModuleState | SurpriseModuleState;

export interface ReminderRuntimeContext {
  customFlags?: Record<string, boolean>;
}

type SendReminderFn = (payload: ReminderPayload) => void;

/**
 * 负责根据配置定时推送提醒的轻量调度器。
 * 所有模块共享统一 tick 间隔，通过增量时间累计、冷却窗口等状态字段来决定是否触发。
 */
export class ReminderScheduler {
  private timer: NodeJS.Timeout | null = null;
  private config: AppConfig | null = null;
  private moduleStates: Partial<Record<ReminderModuleKey, ModuleState>> = {};
  private lastTickAt = Date.now();
  private currentDayStamp = getDayStamp(new Date());
  private runtimeContext: ReminderRuntimeContext = {};

  constructor(private readonly sendReminder: SendReminderFn) {}

  start(config: AppConfig): void {
    this.stop();
    this.config = config;
    this.moduleStates = {};
    this.lastTickAt = Date.now();
    this.currentDayStamp = getDayStamp(new Date());

    // 所有模块共用的基础 tick 频率，保证调度器节奏统一
    const intervalMinutes = Math.max(config.baseIntervalMinutes || 1, 1);
    const intervalMs = intervalMinutes * 60 * 1000;

    this.timer = setInterval(() => this.tick(), intervalMs);
    // 立即执行一次，确保启动时就能根据条件推送
    this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateRuntimeContext(context: Partial<ReminderRuntimeContext>): void {
    // 外部可在运行时注入上下文（例如 custom 触发器依赖的标记位）
    this.runtimeContext = {
      ...this.runtimeContext,
      ...context
    };
  }

  private tick(): void {
    if (!this.config) {
      return;
    }

    const now = Date.now();
    const deltaMinutes = Math.max((now - this.lastTickAt) / 60000, 0); // 当前 tick 距离上次执行的分钟差
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
        // 首次遇到模块时建立独立状态，避免跨模块共享数据
        this.moduleStates[key] = this.createInitialStateForModule(key);
      }

      const state = this.moduleStates[key]!;
      state.elapsedMinutes += deltaMinutes;

      if (key === 'income' && isIncomeModule(moduleConfig) && isIncomeState(state)) {
        // 收益模块需要根据工作时段累积时长与收入
        this.applyIncomeProgress(moduleConfig, state, now, deltaMinutes);
      }

      // 冷却期内直接跳过，等待下一次 tick
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

      // 构造模板上下文，例如收益模块的今日收入
      const context = this.buildContextForModule(key, moduleConfig, state, deltaMinutes, now);
      const renderedText = interpolate(message.text, context);

      this.sendReminder({
        module: key,
        messageId: message.id,
        text: renderedText,
        timestamp: now,
        context
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

  private shouldTriggerModule(
    key: ReminderModuleKey,
    moduleConfig: ReminderModule | IncomeReminderModule | SurpriseModule,
    state: ModuleState,
    now: number
  ): boolean {
    const triggers = moduleConfig.triggers ?? [];
    // 触发器为空时视作始终满足条件（适用于完全随机策略）
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
          // 键鼠监听暂未接入，这里占位留待后续实现
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

    // 惊喜模块在满足基础触发条件后，再应用随机时间窗与概率控制
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

  private buildContextForModule(
    key: ReminderModuleKey,
    moduleConfig: ReminderModule | IncomeReminderModule | SurpriseModule,
    state: ModuleState,
    deltaMinutes: number,
    now: number
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {
      deltaMinutes: Number(deltaMinutes.toFixed(2)),
      timestamp: now
    };

    if (key === 'income' && isIncomeModule(moduleConfig) && isIncomeState(state)) {
      const workedMinutes = state.workedMinutesToday;
      const incomeValue = state.incomeToday;
      context['income'] = incomeValue.toFixed(2);
      context['workedMinutes'] = workedMinutes;
    }

    return context;
  }

  private applyIncomeProgress(
    moduleConfig: IncomeReminderModule,
    state: IncomeModuleState,
    now: number,
    deltaMinutes: number
  ): void {
    // TODO: 支持 ignoreBreaks，当前仅根据工作时间窗口累计。
    // 工作日内累积分钟数并根据时薪推算收益
    const activeMinutes = this.isWithinWorkWindow(now, moduleConfig) ? deltaMinutes : 0;
    state.workedMinutesToday += activeMinutes;
    const hourlyRate = moduleConfig.incomeConfig.hourlyRate || 0;
    state.incomeToday = (state.workedMinutesToday / 60) * hourlyRate;
  }

  private isWithinWorkWindow(timestamp: number, moduleConfig: IncomeReminderModule): boolean {
    // 规范化成分钟做比较，支持跨夜工作时段
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
    // 处理跨夜工作的情况
    return minutes >= startMinutes || minutes < endMinutes;
  }

  private createInitialStateForModule(key: ReminderModuleKey): ModuleState {
    if (key === 'income') {
      // 收益模块需要额外记录今日工作时长与收入
      return {
        elapsedMinutes: 0,
        workedMinutesToday: 0,
        incomeToday: 0
      } as IncomeModuleState;
    }

    if (key === 'surprise') {
      // 惊喜模块维护随机触发窗口
      return {
        elapsedMinutes: 0,
        randomWindow: undefined
      } as SurpriseModuleState;
    }

    return {
      elapsedMinutes: 0
    };
  }

  private resetDailyStates(): void {
    // 跨日时重置计数，避免上一日数据影响今日提醒
    for (const [key, state] of Object.entries(this.moduleStates) as [ReminderModuleKey, ModuleState][]) {
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

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

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

function createRandomWindow(now: number, strategy: SurpriseModule['randomStrategy']): { earliest: number; latest: number } {
  // 根据配置生成一个允许触发的时间窗，避免提醒过于集中
  const { minIntervalMinutes, maxIntervalMinutes } = strategy;
  const minMs = Math.max(minIntervalMinutes, 1) * 60 * 1000;
  const maxMs = Math.max(maxIntervalMinutes, minIntervalMinutes) * 60 * 1000;
  const earliest = now + minMs;
  const latest = now + maxMs;
  return { earliest, latest };
}

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

function getDayStamp(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function isIncomeModule(module: ReminderModule | IncomeReminderModule | SurpriseModule): module is IncomeReminderModule {
  return (module as IncomeReminderModule).incomeConfig !== undefined;
}

function isSurpriseModule(module: ReminderModule | IncomeReminderModule | SurpriseModule): module is SurpriseModule {
  return (module as SurpriseModule).randomStrategy !== undefined;
}

function isIncomeState(state: ModuleState): state is IncomeModuleState {
  return (state as IncomeModuleState).workedMinutesToday !== undefined;
}

function isSurpriseState(state: ModuleState): state is SurpriseModuleState {
  return Object.hasOwn(state, 'randomWindow');
}
