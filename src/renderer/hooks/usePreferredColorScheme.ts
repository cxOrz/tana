import { ref } from 'vue';

/**
 * @file usePreferredColorScheme.ts
 * @description
 * 一个 Vue Composition API hook，用于检测并响应系统的首选颜色方案 (暗黑模式/亮色模式)。
 * 它会自动将 `dark` 类切换到 `<html>` 元素上，并提供一个响应式状态。
 */

/**
 * 监听系统颜色方案的变化，并相应地更新 DOM。
 * @returns {{ isDark: import('vue').Ref<boolean>, stop: () => void }}
 * 返回一个包含以下内容的对象：
 * - `isDark`: 一个响应式的 ref，如果当前是暗黑模式则为 true。
 * - `stop`: 一个函数，用于停止监听颜色方案的变化。
 */
export function usePreferredColorScheme() {
  const target = document.documentElement;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = ref(mediaQuery.matches);

  /**
   * 应用指定的颜色方案。
   * @param {boolean} value - 如果为 true，则应用暗黑模式。
   */
  const apply = (value: boolean) => {
    isDark.value = value;
    target.classList.toggle('dark', value);
  };

  // 初始化时应用一次
  apply(mediaQuery.matches);

  /**
   * 处理媒体查询变化事件。
   * @param {MediaQueryListEvent} event - 变化事件对象。
   */
  const handleChange = (event: MediaQueryListEvent) => apply(event.matches);
  mediaQuery.addEventListener('change', handleChange);

  /**
   * 停止监听颜色方案的变化。
   */
  const stop = () => {
    mediaQuery.removeEventListener('change', handleChange);
  };

  return {
    isDark,
    stop,
  };
}
