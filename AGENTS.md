# Repository Guidelines

## Project Structure & Module Organization
- `src/main` — Electron main process (app bootstrap, IPC, lifecycle).
- `src/renderer` — Vue UI (views, components, composables, assets imports).
- `src/shared` — Types and utilities shared across processes.
- `assets/` — Global sprites/audio; import via `src/renderer/assets`.
- `config/appConfig.json` — Runtime defaults (e.g., window size).
- `dist/` — Build output for Forge; do not edit directly.

## Build, Test, and Development Commands
- `npm run dev` — Run Vite + TypeScript + Electron together for fast iteration.
- `npm run build` — Build renderer (Vite) and main (tsc) into `dist/`.
- `npm run preview` — Serve renderer-only build to validate Vue changes.
- `npm run start` / `npm run make` — Start packaged app / produce installers (after build).

## Coding Style & Naming Conventions
- Language: TypeScript everywhere; 2-space indentation; include semicolons.
- Components/Views: PascalCase (e.g., `PetView.vue`).
- Composables/Hooks: `useName` camelCase (e.g., `useWindowControls.ts`).
- Shared utilities: descriptive filenames (e.g., `windowControls.ts`).
- Styling: prefer Vue SFC `<style>` blocks or Tailwind classes; favor atomic class lists over custom CSS.

## Testing Guidelines
- Automated tests are not yet wired. Minimum manual checks:
  1) `npm run dev` for hot reload and navigation.
  2) `npm run preview` to confirm static assets resolve.
  3) `npm run make` when changing packaging/native integrations.
- If adding tests, use Vitest; colocate specs beside sources (e.g., `Component.spec.ts`) and add an `npm` script plus short docs in the PR.

## Commit & Pull Request Guidelines
- Conventional commits: `type(scope): imperative summary` (e.g., `feat(ui): add window transitions`).
- Keep commits focused; squash trivial fixes; update related config/docs in the same change.
- PRs: include motivation, verification evidence (commands + screenshots for UI), and link issues when available.

## Security & Configuration Tips
- Do not hard‑code secrets. Prefer `config/appConfig.json` or environment variables (via Vite) for overrides.
- Reference new sprites/audio under `assets/` and import through `src/renderer/assets` so both dev and packaged builds work.
