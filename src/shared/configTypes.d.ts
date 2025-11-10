import type { ReminderModuleKey } from './reminderTypes';

export interface AppConfig {
  version: string;
  locale: string;
  baseIntervalMinutes: number;
  reminders: ReminderConfigMap;
  petWindow?: PetWindowConfig;
  notifications?: NotificationConfig;
}

export type ReminderConfigMap = Record<
  ReminderModuleKey,
  ReminderModule | IncomeReminderModule | SurpriseModule
>;

export interface ReminderModule {
  enabled: boolean;
  defaultIntervalMinutes: number;
  cooldownMinutes?: number;
  triggers: TriggerConfig[];
  messages: ReminderMessage[];
}

export interface IncomeReminderModule extends ReminderModule {
  incomeConfig: {
    hourlyRate: number;
    currency: string;
    workdayStart: string; // HH:mm
    workdayEnd: string; // HH:mm
    ignoreBreaks?: boolean;
  };
}

export interface SurpriseModule extends ReminderModule {
  randomStrategy: {
    minIntervalMinutes: number;
    maxIntervalMinutes: number;
    probability: number;
  };
}

export interface TriggerConfig {
  id: string;
  type: 'timeElapsed' | 'idle' | 'custom';
  thresholdMinutes?: number;
}

export interface ReminderMessage {
  id: string;
  text: string;
  weight?: number;
  tags?: string[];
  media?: {
    animationId?: string;
    soundId?: string;
  };
}

export interface PetWindowConfig {
  // Scale factor applied to base window size
  scale: number;
}

export interface NotificationConfig {
  systemEnabled: boolean;
  silent?: boolean;
}
