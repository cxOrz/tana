# Repository Guidelines

## Project Structure & Module Organization
Electron main-process code lives in `src/main`, the Vue renderer UI in `src/renderer`, and shared types/utilities in `src/shared`. Global assets (sprites, audio) sit in `assets`, while runtime defaults such as window dimensions are in `config/appConfig.json`. Build artifacts flow to `dist/`; never touch them directly—change source and rebuild.

## Build, Test, and Development Commands
- `npm run dev` — spawns Vite, TypeScript, and Electron together via `concurrently` for the fastest inner loop.
- `npm run build` — runs `vite build` for the renderer and `tsc -p tsconfig.main.json` for the main process, producing the `dist/` bundle used by forge.
- `npm run preview` — serves the renderer-only build to sanity-check pure Vue changes before touching Electron.
- `npm run start` / `npm run make` — wraps Electron Forge to start a packaged app or produce installers; run after `npm run build`.

## Coding Style & Naming Conventions
Use TypeScript across both processes with 2-space indentation and semicolons (see `src/renderer/main.ts`). Components and views stay in PascalCase (`PetView.vue`), composables/hooks use the `useName` camelCase pattern, and shared utilities prefer descriptive file names (`windowControls.ts`). Keep renderer styling in Vue SFC `<style>` blocks or Tailwind classes; when mixing, favor atomic class lists over custom CSS.

## Testing & Verification
Automated tests are not yet wired up, so provide manual verification notes. At minimum: (1) `npm run dev` to confirm hot reload and navigation, (2) `npm run preview` to verify static assets resolve, and (3) `npm run make` when touching packaging or native integrations. If you add a testing tool (e.g., Vitest), colocate specs beside the source file (`Component.spec.ts`) and document the new script before opening a PR.

## Commit & Pull Request Guidelines
Follow the existing conventional format `type(scope): imperative summary`, e.g., `feat(ui): add smooth window show/hide transitions`. Squash small fixes locally, keep commits scoped to one concern, and update related config/docs in the same change. PRs should describe motivation, testing evidence (commands + screenshots for UI tweaks), and reference issues when available.

## Configuration & Assets
Do not hard-code secrets; extend `config/appConfig.json` or introduce environment variables consumed via Vite if user overrides are needed. Place new sprites or audio under `assets/` and reference them through `src/renderer/assets` imports so bundling works in both dev and packaged builds.
