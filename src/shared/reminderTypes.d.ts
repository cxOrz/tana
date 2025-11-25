/**
 * @file reminderTypes.d.ts
 * @description
 * 定义提醒事件相关的数据结构。
 * 这些类型在主进程和渲染进程之间共享。
 */

/**
 * 提醒模块的唯一标识符。
 * - `daily`: 日常提醒（合并原收益/健康）
 * @typedef {('daily')} ReminderModuleKey
 */
export type ReminderModuleKey = 'daily';

/**
 * 通过 IPC 通道在主进程和渲染进程之间传递的提醒事件的数据负载。
 */
export interface ReminderPayload {
  /**
   * 触发此提醒的模块。
   * @type {ReminderModuleKey}
   */
  module: ReminderModuleKey;

  /**
   * 消息的唯一标识符。
   * @type {string}
   */
  messageId: string;

  /**
   * 最终渲染后的提醒文本。
   * @type {string}
   */
  text: string;

  /**
   * 事件发生时的时间戳。
   * @type {number}
   */
  timestamp: number;

  /**
   * 与此提醒相关的附加上下文数据。
   * @type {Record<string, unknown> | undefined}
   */
  context?: Record<string, unknown>;
}
