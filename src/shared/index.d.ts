/**
 * @file index.d.ts
 * @description
 * 这是一个入口文件，用于重新导出 `shared` 目录下的所有类型定义。
 * 这样做可以方便地从一个地方导入所有共享类型。
 *
 * @example
 * import type { AppConfig, ReminderPayload } from '../shared';
 */

export * from './reminderTypes';
export * from './configTypes';
