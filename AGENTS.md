# AI Agent Development Guidelines

This document provides a comprehensive guide for AI agents developing the Tana Desktop Pet application. It outlines the project's architecture, development workflow, coding style, and key principles to ensure high-quality, consistent contributions.

## 1. Project Overview

Tana is a desktop pet application built with **Electron**, **Vue 3**, and **Pixi.js**. It provides gentle daily reminders and lightweight journaling/daily-report capabilities.

- **Electron**: Application framework for windows, tray integration, and IPC.
- **Vue 3**: UI framework for the renderer process, including reminder bubbles and journal/report screens.
- **Pixi.js**: 2D rendering engine for the pet character and animations.

## 2. Core Architectural Principles

- **Separation of Concerns**: The codebase is strictly divided into three main parts:
  - `src/main`: The Electron main process, which handles all backend logic, including application lifecycle, window management, and reminder scheduling.
  - `src/renderer`: The Vue UI, responsible for rendering the user interface and interacting with the main process via the preload script.
  - `src/shared`: A dedicated directory for TypeScript types, constants, and utilities that are shared between the main and renderer processes.
- **Modularity**: The main process logic is further modularized into services, such as `windowManager.ts`, `trayManager.ts`, and `reminderScheduler.ts`, each with a single responsibility.
- **Security**: The preload script (`src/main/preload.ts`) acts as a secure bridge between the renderer and main processes, exposing only a limited and well-defined API to the renderer.
- **Configuration-Driven**: Behavior is defined in `src/main/appConfig.json` (shipped with the app) and loaded on startup for reminders and journaling settings.

## 3. Development Workflow

### 3.1. Getting Started

1.  **Install Dependencies**: Run `npm install` to set up the environment and install all required packages.
2.  **Run in Development Mode**: Use `npm run dev` to start the application with hot-reloading for both the main and renderer processes.

### 3.2. Key Development Tasks

- **Reminder adjustments**:
  1. Define module keys in `src/shared/reminderTypes.d.ts` if introducing new ones.
  2. Add defaults to `src/main/appConfig.json`.
  3. Update `ReminderConfigMap` in `src/shared/configTypes.d.ts`.
  4. Implement scheduling in `src/main/reminderScheduler.ts`; update notification/bubble rendering as needed.
- **UI changes**:
  1. Create or update Vue components in `src/renderer/components`.
  2. Use Vue hooks (`src/renderer/hooks`) for complex UI logic.
  3. Follow existing styling conventions, using Tailwind CSS where possible.
- **Adding IPC channels**:
  1. Define channel names in `src/shared/constants.ts`.
  2. Register handlers in `src/main/ipcHandlers.ts`.
  3. Expose APIs to the renderer in `src/main/preload.ts`.

### 3.3. Code Quality and Formatting

- **Linting**: Before committing any changes, run `npm run lint` to check for code quality issues.
- **Formatting**: Run `npm run format` to automatically format the code using Prettier.

## 4. Coding Style and Conventions

- **Language**: The entire codebase is written in **TypeScript**. All new code must be strongly typed.
- **Documentation**: All public functions, classes, and methods must have **Chinese JSDoc comments**. The documentation should clearly explain the purpose of the code, all parameters, and the return value.
- **Naming Conventions**:
  - **Components/Views**: `PascalCase` (e.g., `PetView.vue`).
  - **Composables/Hooks**: `use` prefix followed by `camelCase` (e.g., `useReminderBubbles.ts`).
  - **Shared Utilities**: Descriptive `camelCase` filenames (e.g., `windowManager.ts`).
- **Styling**: Use **Tailwind CSS** for all styling. Avoid writing custom CSS whenever possible.

## 5. Key Files and Directories

- `src/main/main.ts`: The application's main entry point.
- `src/main/preload.ts`: The secure bridge between the main and renderer processes.
- `src/main/reminderScheduler.ts`: The core logic for scheduling and triggering reminders (daily module).
- `src/main/services/notifications.ts`: System notification bridge for reminders.
- `src/renderer/hooks/useReminderBubbles.ts` & `src/renderer/components/ReminderBubble.vue`: Reminder UI queueing and display in the renderer.
- `src/renderer/views/PetView.vue`: The main view component for the pet.
- `src/shared/constants.ts`: Shared constants, including IPC channel names.
- `AGENTS.md`: This file.
- `README.md`: The user-facing documentation (in Chinese).

By following these guidelines, you will ensure that your contributions are consistent with the existing codebase and maintain the high quality of the Tana Desktop Pet application.
