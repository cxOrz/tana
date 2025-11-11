import { app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import rawDefaultConfig from './appConfig.json';
import type {
  AppConfig,
  IncomeReminderModule,
  ReminderMessage,
  ReminderModule,
  SurpriseModule,
  TriggerConfig,
} from '../shared';

export type {
  AppConfig,
  IncomeReminderModule,
  ReminderMessage,
  ReminderModule,
  SurpriseModule,
  TriggerConfig,
};

// 以外部 JSON 作为默认配置，避免与磁盘默认值重复维护。
const DEFAULT_CONFIG: AppConfig = rawDefaultConfig as AppConfig;

const CONFIG_DIR_NAME = 'config';
const CONFIG_FILE_NAME = 'appConfig.json';

export const resolveConfigPath = (): string => {
  return join(app.getPath('userData'), CONFIG_DIR_NAME, CONFIG_FILE_NAME);
};

const ensureConfigDir = async (): Promise<string> => {
  const dir = join(app.getPath('userData'), CONFIG_DIR_NAME);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

const ensureConfigFile = async (): Promise<string> => {
  await ensureConfigDir();
  const configPath = resolveConfigPath();

  try {
    await fs.access(configPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
      console.info(`[config] 初始化用户配置: ${configPath}`);
    } else {
      throw error;
    }
  }

  return configPath;
};

export async function loadAppConfig(): Promise<AppConfig> {
  const configPath = await ensureConfigFile();

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return sanitizeConfig(mergeWithDefaults(parsed));
  } catch (error) {
    console.warn(`[config] 读取配置失败，使用默认配置: ${configPath}`, error);
    return sanitizeConfig(DEFAULT_CONFIG);
  }
}

export async function saveAppConfig(config: AppConfig): Promise<AppConfig> {
  await ensureConfigDir();
  const configPath = resolveConfigPath();
  const merged = sanitizeConfig(mergeWithDefaults(config));
  await fs.writeFile(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
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
      income: mergeIncomeModule(
        DEFAULT_CONFIG.reminders.income as IncomeReminderModule,
        incomeOverrides
      ),
      wellness: mergeReminderModule(DEFAULT_CONFIG.reminders.wellness, wellnessOverrides),
      surprise: mergeSurpriseModule(
        DEFAULT_CONFIG.reminders.surprise as SurpriseModule,
        surpriseOverrides
      ),
    },
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
    messages: cloneArray(overrides?.messages, base.messages),
  };
}

function mergeIncomeModule(
  base: IncomeReminderModule,
  overrides?: Partial<IncomeReminderModule>
): IncomeReminderModule {
  return {
    ...mergeReminderModule(base, overrides),
    incomeConfig: {
      ...base.incomeConfig,
      ...overrides?.incomeConfig,
    },
  };
}

function mergeSurpriseModule(
  base: SurpriseModule,
  overrides?: Partial<SurpriseModule>
): SurpriseModule {
  return {
    ...mergeReminderModule(base, overrides),
    randomStrategy: {
      ...base.randomStrategy,
      ...overrides?.randomStrategy,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeConfig(cfg: AppConfig): AppConfig {
  const base = { ...cfg } as AppConfig;
  if (!base.baseIntervalMinutes || base.baseIntervalMinutes < 1) base.baseIntervalMinutes = 1;
  const scale = base.petWindow?.scale ?? 1;
  base.petWindow = { scale: clamp(Number(scale) || 1, 0.5, 3) };
  base.notifications = {
    systemEnabled: base.notifications?.systemEnabled ?? true,
    silent: base.notifications?.silent ?? false,
  };
  return base;
}
