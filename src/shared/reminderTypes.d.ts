export type ReminderModuleKey = 'progress' | 'income' | 'wellness' | 'surprise';

export interface ReminderPayload {
  module: ReminderModuleKey;
  messageId: string;
  text: string;
  timestamp: number;
  context?: Record<string, unknown>;
}
