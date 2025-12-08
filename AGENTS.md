# AI Agent Development Guidelines for Tana

This document provides essential guidelines for AI agents contributing to the Tana Desktop Pet application. Adherence to these instructions is critical for maintaining code quality, consistency, and architectural integrity.

## 1. Core Technologies

- **Framework**: [Electron](https://www.electronjs.org/) for the application shell.
- **UI**: [Vue 3](https://vuejs.org/) with the Composition API.
- **Rendering**: [Pixi.js](https://pixijs.com/) for the animated pet character.
- **Language**: [TypeScript](https://www.typescriptlang.org/) is used throughout the project. Strong typing is mandatory.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) is the primary styling solution. Avoid custom CSS where possible.
- **Packaging**: [Electron Forge](https://www.electronforge.io/) is used for building and packaging the application.

## 2. Architectural Principles

- **Strict Separation of Concerns**: The codebase is divided into three distinct areas:
  - `src/main`: **Main Process Logic**. Handles all backend operations, including windowing, system tray, IPC, and scheduling. It must not contain any UI-related code.
  - `src/renderer`: **Renderer Process UI**. A standard Vue 3 application responsible for all user-facing interfaces.
  - `src/shared`: **Shared Code**. Contains TypeScript types, constants, and simple utilities shared between the `main` and `renderer` processes. This directory must not contain any code that imports from `electron` or `vue`.
- **Security through `preload.ts`**: All communication between the renderer and main processes is managed through the preload script (`src/main/preload.ts`). The renderer process operates in a sandboxed environment and must not have direct access to Node.js or Electron APIs. All necessary APIs must be explicitly and securely exposed via `window.electronAPI`.
- **Modularity**: Main process functionalities are broken down into single-responsibility modules (e.g., `windowManager.ts`, `reminderScheduler.ts`). Maintain this pattern when adding new features.

## 3. Development Workflow

### 3.1. Setup

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the development environment:
    ```bash
    npm run dev
    ```

### 3.2. Code Quality

Before committing any changes, you must perform the following checks:

1.  **Linting**: Run `npm run lint` to identify and fix any code quality issues reported by ESLint.
2.  **Formatting**: Run `npm run format` to format the entire codebase with Prettier. This is a mandatory step.

### 3.3. Common Development Tasks

- **Adding a new IPC Channel**:
  1.  Define the channel name in `src/shared/constants.ts`.
  2.  Register the handler in `src/main/ipcHandlers.ts` using `ipcMain.handle` or `ipcMain.on`.
  3.  Expose the corresponding function to the renderer process in `src/main/preload.ts`.
  4.  Update the `electronAPI` type definition in `src/shared/index.d.ts`.

- **Modifying Reminder Logic**:
  1.  Adjust reminder configurations in `src/main/appConfig.json`.
  2.  Update relevant TypeScript types in `src/shared/reminderTypes.d.ts` and `src/shared/configTypes.d.ts`.
  3.  Modify the scheduling and triggering logic within `src/main/reminderScheduler.ts`.

- **Changing UI Components**:
  1.  Vue components are located in `src/renderer/components`.
  2.  Complex, reusable UI logic should be encapsulated in Composition API hooks within `src/renderer/hooks`.

## 4. Coding Conventions

- **Documentation**: All public functions, classes, and complex logic must have **JSDoc comments written in Chinese (中文)**. Comments should clearly explain the purpose, parameters, and return values.
- **Naming**:
  - **Vue Components**: `PascalCase` (e.g., `ReminderBubble.vue`).
  - **Composables/Hooks**: `useCamelCase` (e.g., `usePixiPet.ts`).
  - **Modules/Services**: `camelCase` (e.g., `windowManager.ts`).
- **Imports**: Use absolute paths relative to the `tsconfig.json` `baseUrl` where possible (e.g., `@/components/ui/button`).
- **Error Handling**: Gracefully handle potential errors, especially in file system operations (`journalStore.ts`) and API calls (`journalSummary.ts`).

## 5. Key Files for Reference

- `src/main/main.ts`: Application entry point.
- `src/main/preload.ts`: Security bridge between processes.
- `src/main/windowManager.ts`: Manages all application windows.
- `src/main/reminderScheduler.ts`: Core logic for scheduling reminders.
- `src/main/services/journalStore.ts`: Handles persistence of journal entries.
- `src/renderer/views/PetView.vue`: The main view component for the pet.
- `src/renderer/hooks/usePixiPet.ts`: Encapsulates Pixi.js animation logic.
- `src/renderer/hooks/useReminderBubbles.ts`: Manages the reminder UI queue.
- `src/shared/constants.ts`: Central repository for shared constants like IPC channel names.
- `forge.config.js`: Build and packaging configuration.
