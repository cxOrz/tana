<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type {
  AppConfig,
} from '../../shared';

const loading = ref(true);
const loadError = ref<string | null>(null);
const config = ref<AppConfig | null>(null);
const originalConfig = ref<AppConfig | null>(null);

const cloneConfig = (value: AppConfig): AppConfig => JSON.parse(JSON.stringify(value)) as AppConfig;


onMounted(() => {
  loadConfig();
});

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
  <div class="min-h-screen w-full bg-background">
    ConfigCenter
  </div>
</template>

<style scoped>
</style>
