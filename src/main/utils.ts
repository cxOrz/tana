import { app } from 'electron';
import { join } from 'path';
import type { AppConfig } from '../shared';

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

/**
 * Calculates the workday progress as a ratio.
 * @param workDayConfig - The start and end times of the workday.
 * @param now - The current timestamp.
 * @returns {number} The progress ratio (0-1), or 0 if invalid.
 */
export function calculateWorkdayProgress(
  workDayConfig: AppConfig['workDay'],
  now: number
): number {
  if (!workDayConfig) {
    return 0;
  }

  const { startTime, endTime } = workDayConfig;
  const nowTime = new Date(now);
  // Create a date object for today at 00:00:00 to use as a base
  const startOfDay = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const workStartTime = new Date(startOfDay.getTime()).setHours(startHour, startMinute, 0, 0);

  const [endHour, endMinute] = endTime.split(':').map(Number);
  const workEndTime = new Date(startOfDay.getTime()).setHours(endHour, endMinute, 0, 0);

  const totalWorkdayMs = workEndTime - workStartTime;
  if (totalWorkdayMs <= 0) {
    return 0;
  }

  const elapsedMsSinceStart = now - workStartTime;
  return Math.max(0, Math.min(1, elapsedMsSinceStart / totalWorkdayMs));
}
