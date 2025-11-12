import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * @file utils.ts
 * @description
 * 通用的辅助函数库。
 */

/**
 * 合并多个 CSS 类名，并处理 Tailwind CSS 类的冲突。
 * 这个函数结合了 `clsx` 和 `tailwind-merge` 的功能。
 *
 * @param {...ClassValue[]} inputs - 一个或多个 CSS 类名。
 *   可以是字符串、对象或数组。
 * @returns {string} 合并和优化后的 CSS 类名字符串。
 *
 * @example
 * cn('p-4', 'font-bold', { 'bg-red-500': hasError });
 * // => "p-4 font-bold bg-red-500" (if hasError is true)
 *
 * @example
 * cn('p-4', 'p-2');
 * // => "p-2" (tailwind-merge resolves the conflict)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
