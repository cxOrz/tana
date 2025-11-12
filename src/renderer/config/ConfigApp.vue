<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { AppConfig } from '../../shared';

/**
 * @file ConfigApp.vue
 * @description
 * 配置中心的主组件。
 * 负责加载、显示和（未来可能）保存应用的配置。
 */

/**
 * @ref
 * @description 是否正在加载配置。
 * @type {import('vue').Ref<boolean>}
 */
const loading = ref(true);

/**
 * @ref
 * @description 加载配置时发生的错误信息。
 * @type {import('vue').Ref<string | null>}
 */
const loadError = ref<string | null>(null);

/**
 * @ref
 * @description 当前的应用配置对象。
 * @type {import('vue').Ref<AppConfig | null>}
 */
const config = ref<AppConfig | null>(null);

/**
 * @ref
 * @description 原始的应用配置对象，用于比较和重置。
 * @type {import('vue').Ref<AppConfig | null>}
 */
const originalConfig = ref<AppConfig | null>(null);

/**
 * 深拷贝一个配置对象。
 * @param {AppConfig} value - 要克隆的配置对象。
 * @returns {AppConfig} 克隆后的新对象。
 */
const cloneConfig = (value: AppConfig): AppConfig => JSON.parse(JSON.stringify(value)) as AppConfig;

onMounted(() => {
  loadConfig();
});

/**
 * 通过 Electron 的 IPC 通道从主进程异步加载应用配置。
 * @async
 */
async function loadConfig() {
  if (!window?.electronAPI?.loadAppConfig) {
    loadError.value = '渲染进程无法访问配置接口，请检查 preload 设置。';
    loading.value = false;
    return;
  }

  loading.value = true;
  loadError.value = null;
  try {
    const data = await window.electronAPI.loadAppConfig();
    config.value = cloneConfig(data);
    originalConfig.value = cloneConfig(data);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen w-full bg-background">ConfigCenter</div>
</template>

<style scoped></style>
