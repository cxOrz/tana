import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import './base.css';
import ConfigScreen from './config/ConfigApp.vue';
import PetScreen from './views/PetView.vue';
import { usePreferredColorScheme } from './hooks/usePreferredColorScheme';

usePreferredColorScheme();

const routes = [
  { path: '/', name: 'home', component: PetScreen },
  { path: '/config', name: 'config', component: ConfigScreen },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);

app.use(router);
app.mount('#app');
