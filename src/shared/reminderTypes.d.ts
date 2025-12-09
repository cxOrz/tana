export interface ReminderPayload {
  messageId: string; // 消息的唯一标识符。
  text: string; // 最终渲染后的提醒文本。
  timestamp: number; // 事件发生时的时间戳。
  context?: Record<string, unknown>; // 与此提醒相关的附加上下文数据。
}
