// ESLint flat config for Vue 3 + TypeScript + Electron
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
// Use the flat export per upstream docs
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  // Ignored paths
  { ignores: ['dist/**', 'node_modules/**'] },

  // Base JS recommendations
  js.configs.recommended,

  // Vue recommended (flat config)
  ...vue.configs['flat/recommended'],

  // TypeScript recommended
  ...tseslint.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
  },

  // Vue Single File Components
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // Allow single-word component names (e.g., App.vue, PetView.vue)
      'vue/multi-word-component-names': 'off',
    },
  },

  // Renderer (browser) globals
  {
    files: ['src/renderer/**/*.{ts,tsx,js,jsx,vue}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
  },

  // Main + preload (Node/Electron main process) globals
  {
    files: ['src/main/**/*.{ts,js}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2021 },
    },
  },

  // Relax TypeScript 'any' to warning across TS and Vue files
  {
    files: ['**/*.{ts,tsx,vue}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // Turn off all formatting-related rules in favor of Prettier
  eslintConfigPrettier,

  // Node CJS config files (forge) - allow require/module
  {
    files: ['forge.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
