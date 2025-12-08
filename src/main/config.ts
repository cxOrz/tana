/**
 * @file config.ts
 * @description
 * 负责加载和管理应用配置。
 * 配置文件存储在用户主目录的 `.tana/config.json` 路径下，并在首次启动时根据 `appConfig.json` 模板创建。
 * 仅负责配置的读取与基本健壮性处理，不对配置进行合并。
 */

import { app } from 'electron';
import { promises as fs } from 'fs';
import { join } from 'path';
import rawDefaultConfig from './appConfig.json';
import type { AppConfig, ReminderMessage, ReminderModule } from '../shared';

export type {
  AppConfig,
  ReminderMessage,
  ReminderModule,
};

// 以外部 JSON 作为默认配置，避免与磁盘默认值重复维护。
const DEFAULT_CONFIG: AppConfig = rawDefaultConfig as AppConfig;

const CONFIG_ROOT_DIR = '.tana';
const CONFIG_FILE_NAME = 'config.json';

/**
 * 解析配置目录的路径（`.tana`），统一放置在用户主目录下的隐藏文件夹。
 */
const resolveConfigDir = (): string => {
  return join(app.getPath('home'), CONFIG_ROOT_DIR);
};

/**
 * 解析并返回应用配置文件的绝对路径。
 */
export const resolveConfigPath = (): string => {
  return join(resolveConfigDir(), CONFIG_FILE_NAME);
};

/**
 * 确保应用配置目录存在，如果不存在则创建。
 */
const ensureConfigDir = async (): Promise<string> => {
  const dir = resolveConfigDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

/**
 * 确保应用配置文件存在。如果不存在，则根据 `appConfig.json` 模板创建一个新的。
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
 * 直接返回磁盘上的配置内容，如果读取或解析失败，将返回默认配置。
 */
export async function loadAppConfig(): Promise<AppConfig> {
  const configPath = await ensureConfigFile();

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as AppConfig;
    return parsed;
  } catch (error) {
    console.warn(`[config] 读取配置失败，使用默认配置: ${configPath}`, error);
    return DEFAULT_CONFIG;
  }
}
