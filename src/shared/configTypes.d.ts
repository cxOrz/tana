import type { ReminderModuleKey } from './reminderTypes';

/**
 * @file configTypes.d.ts
 * @description
 * 定义应用配置相关的数据结构。
 * 这些类型在主进程和渲染进程之间共享。
 */

/**
 * 应用的顶层配置结构。
 */
export interface AppConfig {
  /**
   * 配置的版本号。
   * @type {string}
   */
  version: string;

  /**
   * 语言环境设置。
   * @type {string}
   */
  locale: string;

  /**
   * 调度器的基础轮询时间间隔（分钟）。
   * @type {number}
   */
  baseIntervalMinutes: number;

  /**
   * 所有提醒模块的配置集合。
   * @type {ReminderConfigMap}
   */
  reminders: ReminderConfigMap;

  /**
   * 宠物窗口的配置。
   * @type {PetWindowConfig | undefined}
   */
  petWindow?: PetWindowConfig;

  /**
   * 系统通知的配置。
   * @type {NotificationConfig | undefined}
   */
  notifications?: NotificationConfig;

  /**
   * 日志/记忆功能的配置。
   * @type {JournalConfig | undefined}
   */
  journal?: JournalConfig;
}

/**
 * 提醒模块配置的映射表。
 * 键是模块的唯一标识符。
 */
export type ReminderConfigMap = Record<ReminderModuleKey, ReminderModule>;

/**
 * 基础提醒模块的配置。
 */
export interface ReminderModule {
  /**
   * 是否启用此模块。
   * @type {boolean}
   */
  enabled: boolean;

  /**
   * 默认的触发时间间隔（分钟）。
   * @type {number}
   */
  defaultIntervalMinutes: number;

  /**
   * 触发后的冷却时间（分钟）。
   * @type {number | undefined}
   */
  cooldownMinutes?: number;

  /**
   * 触发此模块的条件列表。
   * @type {TriggerConfig[]}
   */
  triggers: TriggerConfig[];

  /**
   * 此模块可发送的消息列表。
   * @type {ReminderMessage[]}
   */
  messages: ReminderMessage[];
}

/**
 * 提醒触发器的配置。
 */
export interface TriggerConfig {
  /**
   * 触发器的唯一标识符。
   * @type {string}
   */
  id: string;

  /**
   * 触发器的类型。
   * - `timeElapsed`: 时间流逝
   * - `idle`: 用户空闲
   * - `custom`: 自定义事件
   * @type {('timeElapsed' | 'idle' | 'custom')}
   */
  type: 'timeElapsed' | 'idle' | 'custom';

  /**
   * 时间流逝触发器的阈值（分钟）。
   * @type {number | undefined}
   */
  thresholdMinutes?: number;
}

/**
 * 提醒消息的结构。
 */
export interface ReminderMessage {
  /**
   * 消息的唯一标识符。
   * @type {string}
   */
  id: string;

  /**
   * 消息的文本内容，支持 `{key}` 格式的模板变量。
   * @type {string}
   */
  text: string;

  /**
   * 消息的标签，用于分类或过滤。
   * @type {string[] | undefined}
   */
  tags?: string[];

  /**
   * 与消息关联的媒体资源。
   * @type {{ animationId?: string; soundId?: string; } | undefined}
   */
  media?: {
    animationId?: string;
    soundId?: string;
  };
}

/**
 * 宠物窗口的配置。
 */
export interface PetWindowConfig {
  /**
   * 应用于基础窗口尺寸的缩放因子。
   * @type {number}
   */
  scale: number;
}

/**
 * 系统通知的配置。
 */
export interface NotificationConfig {
  /**
   * 是否启用系统通知。
   * @type {boolean}
   */
  systemEnabled: boolean;

  /**
   * 是否静默通知（无声音）。
   * @type {boolean | undefined}
   */
  silent?: boolean;
}

/**
 * 日志/记忆功能的配置。
 */
export interface JournalConfig {
  /**
   * 每日推送日报的时间，格式 HH:mm。
   * @type {string}
   */
  dailyReportTime: string;

  /**
   * 是否启用日报通知。
   * @type {boolean | undefined}
   */
  notifyEnabled?: boolean;

  /**
   * 打开快速输入窗口的快捷键。
   * @type {string | undefined}
   */
  hotkey?: string;
}
