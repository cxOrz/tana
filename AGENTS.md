# AI Agent Development Guidelines

This document provides a comprehensive guide for AI agents developing the Tana Desktop Pet application. It outlines the project's architecture, development workflow, coding style, and key principles to ensure high-quality, consistent contributions.

## 1. Project Overview

Tana is a desktop pet application built with **Electron**, **Vue 3**, and **Pixi.js**. Its purpose is to provide users with timely reminders for focus, health, and income tracking in an engaging and non-intrusive way.

- **Electron**: The application framework, responsible for creating and managing windows, system tray integration, and inter-process communication (IPC).
- **Vue 3**: The UI framework for the renderer process, used to create the user interface, including the reminder bubbles and configuration screen.
- **Pixi.js**: A 2D rendering engine used to display and animate the pet character.

## 2. Core Architectural Principles

- **Separation of Concerns**: The codebase is strictly divided into three main parts:
  - `src/main`: The Electron main process, which handles all backend logic, including application lifecycle, window management, and reminder scheduling.
  - `src/renderer`: The Vue UI, responsible for rendering the user interface and interacting with the main process via the preload script.
  - `src/shared`: A dedicated directory for TypeScript types, constants, and utilities that are shared between the main and renderer processes.
- **Modularity**: The main process logic is further modularized into services, such as `windowManager.ts`, `trayManager.ts`, and `reminderScheduler.ts`, each with a single responsibility.
- **Security**: The preload script (`src/main/preload.ts`) acts as a secure bridge between the renderer and main processes, exposing only a limited and well-defined API to the renderer.
- **Configuration-Driven**: The application's behavior is driven by a JSON configuration file (`appConfig.json`), which is copied to the user's data directory on first launch. This allows for easy customization of reminders and other settings.

## 3. Development Workflow

### 3.1. Getting Started

1.  **Install Dependencies**: Run `npm install` to set up the environment and install all required packages.
2.  **Run in Development Mode**: Use `npm run dev` to start the application with hot-reloading for both the main and renderer processes.

### 3.2. Key Development Tasks

- **Adding a New Reminder Module**:
  1.  Define the new module's key in `src/shared/reminderTypes.d.ts`.
  2.  Add the module's configuration to `src/main/appConfig.json`.
  3.  Update the `ReminderConfigMap` in `src/shared/configTypes.d.ts` to include the new module.
  4.  Implement the module's logic in the `ReminderScheduler` (`src/main/reminderScheduler.ts`).
- **Modifying the UI**:
  1.  Create or update Vue components in `src/renderer/components`.
  2.  Use Vue hooks (`src/renderer/hooks`) to encapsulate complex UI logic.
  3.  Follow the existing styling conventions, using Tailwind CSS classes whenever possible.
- **Adding IPC Channels**:
  1.  Define the new channel name in `src/shared/constants.ts`.
  2.  Register the handler in the main process (`src/main/ipcHandlers.ts`).
  3.  Expose the API to the renderer process in the preload script (`src/main/preload.ts`).

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
- `src/main/reminderScheduler.ts`: The core logic for scheduling and triggering reminders.
- `src/renderer/views/PetView.vue`: The main view component for the pet.
- `src/shared/constants.ts`: Shared constants, including IPC channel names.
- `AGENTS.md`: This file.
- `README.md`: The user-facing documentation (in Chinese).

By following these guidelines, you will ensure that your contributions are consistent with the existing codebase and maintain the high quality of the Tana Desktop Pet application.
