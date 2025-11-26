// 提醒事件相关的数据结构，供主进程和渲染进程共享。
export type ReminderModuleKey = 'daily'; // `daily`: 日常提醒（合并原收益/健康）。

export interface ReminderPayload {
  module: ReminderModuleKey; // 触发此提醒的模块。
  messageId: string; // 消息的唯一标识符。
  text: string; // 最终渲染后的提醒文本。
  timestamp: number; // 事件发生时的时间戳。
  context?: Record<string, unknown>; // 与此提醒相关的附加上下文数据。
}
