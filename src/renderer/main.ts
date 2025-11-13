import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import './base.css';
import ConfigScreen from './config/ConfigApp.vue';
import PetScreen from './views/PetView.vue';
import { usePreferredColorScheme } from './hooks/usePreferredColorScheme';

// 初始化颜色方案 (light/dark mode)
usePreferredColorScheme();

/**
 * 定义应用的路由。
 * - `/`: 主屏幕 (宠物视图)
 * - `/config`: 配置屏幕
 */
const routes = [
  { path: '/', name: 'home', component: PetScreen },
  { path: '/config', name: 'config', component: ConfigScreen },
];

/**
 * 创建 Vue Router 实例。
 * 使用 hash 模式，这在 Electron 应用中很常见。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 创建 Vue 应用实例
const app = createApp(App);

// 注册路由插件
app.use(router);

// 将应用挂载到 DOM 中 ID 为 'app' 的元素上
app.mount('#app');
