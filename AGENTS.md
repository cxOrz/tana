# AI Agent Development Guidelines

> These rules cover every file and directory in this repository.

## Scope & Architecture
- **Stack**: Electron (main process lifecycle, tray, windows), Vue 3 (renderer UI), Pixi.js (pet rendering and animation), and TypeScript across all layers.
- **Processes**:
  - `src/main`: Electron main process—app lifecycle, tray, windows, configuration, and reminder scheduling.
  - `src/renderer`: Vue 3 renderer—UI, reminder bubbles, logs, pet view; communicates through the preload bridge.
  - `src/shared`: Shared types and constants used by both processes.
- **Configuration**:
  - Default template: `src/main/appConfig.json`.
  - Runtime config: `~/.tana/config.json` in the user's home directory; delete to regenerate defaults on next launch.

## House Rules
- **Type safety**: Use TypeScript with strict typing; avoid `any`. Keep shared definitions in `src/shared`.
- **Documentation**: Public classes, functions, and methods should include concise Chinese JSDoc describing purpose, parameters, and return values.
- **Styling**: Prefer Tailwind CSS utilities; avoid scattering bespoke style files.
- **IPC boundary**: Only expose renderer-accessible APIs via `src/main/preload.ts`. Declare new channels in `src/shared/constants.ts` and register handlers in `src/main/ipcHandlers.ts`.
- **Compatibility stance**: This is an aggressive project—do not add legacy/compat code paths or migrations. Assume the latest config, structures, and behaviors; prefer directly updating, overwriting, or deleting old code/paths rather than normalizing or preserving them.
- **Module ownership**:
  - Config management: `src/main/config.ts` reads/writes `~/.tana/config.json`.
  - Scheduling: `src/main/reminderScheduler.ts` manages reminders and daily journal delivery.
  - Windows/Tray: `src/main/windowManager.ts` and `src/main/trayManager.ts`.
  - UI: Components live in `src/renderer/components`; composables in `src/renderer/hooks`.
- **Code quality**: Run `npm run lint` and `npm run format` before committing when possible.

## Workflow Expectations
1. Branch from `main` with clear commits (Conventional Commits recommended).
2. When adding configuration fields, update both `src/main/appConfig.json` and the loader in `src/main/config.ts`.
3. Keep shared contracts aligned—update types/constants in `src/shared` whenever main or renderer logic changes.
4. Refresh documentation (README, inline comments) to reflect behavioral changes.

## Testing & Validation
- Preferred checks: `npm run lint`, `npm run format`.
- For packaging, run `npm run build` then `npm run make` when needed.

Following these conventions keeps main, renderer, and shared layers aligned and reduces regressions across the app.
