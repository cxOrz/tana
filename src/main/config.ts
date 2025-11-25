/**
 * @file config.ts
 * @description
 * 负责加载和管理应用配置。
 * 配置文件存储在用户数据目录中，并在首次启动时根据 `appConfig.json` 模板创建。
 * 提供配置的合并、清理和验证功能，以确保应用的健壮性。
 */
import { app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import rawDefaultConfig from './appConfig.json';
import type { AppConfig, ReminderMessage, ReminderModule, TriggerConfig } from '../shared';

export type {
  AppConfig,
  ReminderMessage,
  ReminderModule,
  TriggerConfig,
};

// 以外部 JSON 作为默认配置，避免与磁盘默认值重复维护。
const DEFAULT_CONFIG: AppConfig = rawDefaultConfig as AppConfig;

const CONFIG_DIR_NAME = 'config';
const CONFIG_FILE_NAME = 'appConfig.json';

/**
 * 解析并返回应用配置文件的绝对路径。
 * @returns {string} 配置文件的路径。
 */
export const resolveConfigPath = (): string => {
  return join(app.getPath('userData'), CONFIG_DIR_NAME, CONFIG_FILE_NAME);
};

/**
 * 确保应用配置目录存在，如果不存在则创建。
 * @returns {Promise<string>} 配置目录的路径。
 */
const ensureConfigDir = async (): Promise<string> => {
  const dir = join(app.getPath('userData'), CONFIG_DIR_NAME);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

/**
 * 确保应用配置文件存在。如果不存在，则根据 `appConfig.json` 模板创建一个新的。
 * @returns {Promise<string>} 配置文件的路径。
 */
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

/**
 * 加载应用配置。
 * 如果配置文件不存在，则会先创建一个默认配置。
 * 如果读取或解析失败，将返回默认配置。
 * @returns {Promise<AppConfig>} 加载并 sanitze 后的应用配置。
 */
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

/**
 * 将部分配置与默认配置进行深度合并。
 * @param {Partial<AppConfig>} partial - 需要合并的部分配置。
 * @returns {AppConfig} 合并后的完整配置。
 */
export function mergeWithDefaults(partial: Partial<AppConfig>): AppConfig {
  const dailyOverrides = partial.reminders?.daily as Partial<ReminderModule> | undefined;

  return {
    ...DEFAULT_CONFIG,
    ...partial,
    reminders: {
      daily: mergeReminderModule(DEFAULT_CONFIG.reminders.daily, dailyOverrides),
    },
  };
}

/**
 * 合并提醒模块的基础配置和覆盖配置。
 * @template T
 * @param {T} base - 基础提醒模块配置。
 * @param {Partial<T>} [overrides] - 需要覆盖的配置。
 * @returns {T} 合并后的提醒模块配置。
 */
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

/**
 * 将数值限制在指定的最小和最大值之间。
 * @param {number} value - 需要限制的数值。
 * @param {number} min - 最小值。
 * @param {number} max - 最大值。
 * @returns {number} 限制后的数值。
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 清理和验证应用配置，确保关键字段具有有效值。
 * @param {AppConfig} cfg - 需要清理的配置对象。
 * @returns {AppConfig} 清理后的配置对象。
 */
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
