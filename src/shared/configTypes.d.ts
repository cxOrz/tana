// 应用配置相关类型，供主进程与渲染进程共享。
export interface AppConfig {
  version: string; // 配置的版本号。
  baseIntervalMinutes: number; // 调度器的基础轮询时间间隔（分钟）。
  reminders: ReminderModule; // 提醒模块的配置。
  ai?: AiConfig; // 全局 AI 能力的配置。
  petWindow?: PetWindowConfig; // 宠物窗口的配置。
  notifications?: NotificationConfig; // 系统通知的配置。
  journal?: JournalConfig; // 日志/记忆功能的配置。
  workDay?: {
    startTime: string;
    endTime: string;
  };
}

export interface ReminderModule {
  enabled: boolean; // 是否启用此模块。
  defaultIntervalMinutes: number; // 默认的触发时间间隔（分钟）。
  messages: ReminderMessage[]; // 此模块可发送的消息列表。
}

export interface ReminderMessage {
  id: string; // 消息的唯一标识符。
  text: string; // 支持 `{key}` 格式的模板变量。
  type?: string; // 消息类型，用于特定逻辑处理，如 'salary'。
  targetEarnSalary?: number; // 配合特定类型（如 'salary'）使用的目标值。
  tags?: string[]; // 消息标签，用于分类或过滤。
  media?: {
    animationId?: string;
    soundId?: string;
  }; // 与消息关联的媒体资源。
}

export interface PetWindowConfig {
  scale: number; // 应用于基础窗口尺寸的缩放因子。
}

export interface NotificationConfig {
  systemEnabled: boolean; // 是否启用系统通知。
}

export interface JournalConfig {
  dailyReportTime: string; // 每日推送日报的时间，格式 HH:mm。
  notifyEnabled?: boolean; // 是否启用日报通知。
  hotkey?: string; // 打开快速输入窗口的快捷键。
}

export interface AiConfig {
  model: string; // 使用的模型 ID。
  apiKey: string; // 模型服务的访问密钥。
  baseURL?: string; // 可选的自定义服务地址。
}
