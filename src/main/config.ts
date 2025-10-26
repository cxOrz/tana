import { app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import rawDefaultConfig from '../../config/appConfig.json';
import type { ReminderModuleKey } from '../shared';

export interface AppConfig {
  version: string;
  locale: string;
  baseIntervalMinutes: number;
  reminders: ReminderConfigMap;
}

export type ReminderConfigMap = Record<ReminderModuleKey, ReminderModule | IncomeReminderModule | SurpriseModule>;

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

// 以外部 JSON 作为默认配置，避免与磁盘默认值重复维护。
const DEFAULT_CONFIG: AppConfig = rawDefaultConfig as AppConfig;

const CONFIG_RELATIVE_PATH = join('config', 'appConfig.json');

export const resolveConfigPath = (): string => {
  if (app.isPackaged) {
    return join(process.resourcesPath, CONFIG_RELATIVE_PATH);
  }

  return join(app.getAppPath(), CONFIG_RELATIVE_PATH);
};

export async function loadAppConfig(): Promise<AppConfig> {
  const configPath = resolveConfigPath();

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return mergeWithDefaults(parsed);
  } catch (error) {
    console.warn(`[config] 读取配置失败，使用默认配置: ${configPath}`, error);
    return DEFAULT_CONFIG;
  }
}

export function mergeWithDefaults(partial: Partial<AppConfig>): AppConfig {
  const progressOverrides = partial.reminders?.progress as Partial<ReminderModule> | undefined;
  const incomeOverrides = partial.reminders?.income as Partial<IncomeReminderModule> | undefined;
  const wellnessOverrides = partial.reminders?.wellness as Partial<ReminderModule> | undefined;
  const surpriseOverrides = partial.reminders?.surprise as Partial<SurpriseModule> | undefined;

  return {
    ...DEFAULT_CONFIG,
    ...partial,
    reminders: {
      progress: mergeReminderModule(DEFAULT_CONFIG.reminders.progress, progressOverrides),
      income: mergeIncomeModule(DEFAULT_CONFIG.reminders.income as IncomeReminderModule, incomeOverrides),
      wellness: mergeReminderModule(DEFAULT_CONFIG.reminders.wellness, wellnessOverrides),
      surprise: mergeSurpriseModule(DEFAULT_CONFIG.reminders.surprise as SurpriseModule, surpriseOverrides)
    }
  };
}

function mergeReminderModule<T extends ReminderModule>(base: T, overrides?: Partial<T>): T {
  const cloneArray = <U>(value: U[] | undefined, fallback: U[]): U[] => {
    return value ? [...value] : [...fallback];
  };

  return {
    ...base,
    ...overrides,
    triggers: cloneArray(overrides?.triggers, base.triggers),
    messages: cloneArray(overrides?.messages, base.messages)
  };
}

function mergeIncomeModule(base: IncomeReminderModule, overrides?: Partial<IncomeReminderModule>): IncomeReminderModule {
  return {
    ...mergeReminderModule(base, overrides),
    incomeConfig: {
      ...base.incomeConfig,
      ...overrides?.incomeConfig
    }
  };
}

function mergeSurpriseModule(base: SurpriseModule, overrides?: Partial<SurpriseModule>): SurpriseModule {
  return {
    ...mergeReminderModule(base, overrides),
    randomStrategy: {
      ...base.randomStrategy,
      ...overrides?.randomStrategy
    }
  };
}
