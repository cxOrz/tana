import { app } from 'electron';
import { join } from 'path';

/**
 * @file utils.ts
 * @description
 * 主进程的通用辅助函数。
 */

/**
 * 解析并返回静态资源的绝对路径。
 * @param {...string[]} paths - 相对于 `assets` 目录的路径片段。
 * @returns {string} 静态资源的完整路径。
 */
export const resolveAssetPath = (...paths: string[]): string => {
  const assetsBase = app.isPackaged
    ? join(process.resourcesPath, 'assets')
    : join(__dirname, '../../assets');
  return join(assetsBase, ...paths);
};
