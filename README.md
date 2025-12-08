# Tana Desktop Pet

Tana is an open-source desktop pet application built with Electron, Vue 3, and Pixi.js. It provides configurable reminders and a local journaling system.

## Core Features

- **Desktop Pet Interface**: Renders an animated character on the desktop. The window is transparent, borderless, and always-on-top.
- **Reminder System**: Delivers notifications based on user-defined configurations in `appConfig.json`. Reminders are displayed as temporary bubbles within the pet's window.
- **Journaling**:
  - **Quick Input**: A global hotkey (default: `Alt+J`) opens a dedicated window for quick text entry.
  - **Daily Report**: Journal entries are stored locally by date and can be viewed in a report window.
  - **AI Summary**: Can optionally generate a daily summary of journal entries using a configurable external AI service (e.g., OpenRouter).

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation and Execution

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/tana-desktop-pet.git
    cd tana-desktop-pet
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run in development mode**
    ```bash
    npm run dev
    ```

## Development Scripts

- `npm run dev`: Starts the development environment with hot-reloading.
- `npm run build`: Builds the application for production.
- `npm run make`: Builds and packages the application into a distributable installer.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run format`: Formats the codebase using Prettier.

## Project Structure

```
.
├── src/
│   ├── main/                # Electron Main Process
│   │   ├── services/        # Journal-related services (scheduling, storage, AI summary)
│   │   ├── config.ts        # Configuration loading
│   │   ├── main.ts          # Application entry point
│   │   ├── preload.ts       # Secure IPC bridge
│   │   ├── reminderScheduler.ts # Reminder scheduler
│   │   ├── trayManager.ts   # Tray menu manager
│   │   └── windowManager.ts # Window manager
│   │
│   ├── renderer/            # Renderer Process (Vue 3 UI)
│   │   ├── hooks/           # Reusable UI logic (Composition API)
│   │   └── views/           # Page-level components
│   │
│   └── shared/              # Shared types and constants
│
└── forge.config.js          # Electron Forge package configuration
```

## Configuration

Application behavior is controlled by `appConfig.json`. On first launch, a default configuration is copied to the user data directory (e.g., `~/.config/Tana/config/` on Linux). Subsequent changes should be made to this file.

Key configurable options include:
- Reminder frequency, content, and triggers.
- Journaling hotkey and AI summary provider settings (API key, model).
- Pet window scale.

**Note**: The application must be restarted for configuration changes to take effect.

## Contributions

Contributions are welcome. Please adhere to the existing code style and conventions. For AI agent development, refer to the `AGENTS.md` file for detailed guidelines.

## License

This project is licensed under the [ISC License](./LICENSE).
