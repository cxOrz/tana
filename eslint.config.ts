import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVitest from '@vitest/eslint-plugin';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import globals from 'globals';

// Vue + TS baseline with Electron (main) and browser (renderer) globals
export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,tsx,mts}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    '**/out/**',
    '**/node_modules/**',
  ]),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/**/*.{ts,tsx,mts}'],
  },

  {
    files: ['src/renderer/**/*.{ts,tsx,vue}'],
    languageOptions: { globals: { ...globals.browser, ...globals.es2021 } },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    files: ['src/main/**/*.{ts,js}'],
    languageOptions: { globals: { ...globals.node, ...globals.es2021 } },
  },

  {
    files: ['**/*.{ts,tsx,vue}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  skipFormatting
);
