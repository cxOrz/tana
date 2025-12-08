# Tana — 您的桌面贴心伴侣

Tana 是一款开源的桌面宠物应用，它将一只可爱的史莱姆带到您的桌面上，旨在通过轻量、无干扰的方式为您提供贴心提醒和便捷的日志记录功能。

项目基于 **Electron + Vue 3 + Pixi.js** 构建，确保了流畅的动画效果和跨平台的兼容性。

![Tana 截图](https://raw.githubusercontent.com/your-username/tana-desktop-pet/main/assets/screenshot.png) <!-- 占位符，建议替换为实际截图 -->

## ✨ 核心特性

- **生动的桌面宠物**：基于 Pixi.js 渲染，拥有流畅的待机动画。窗口透明、无边框且始终置顶，确保 Tana 在不打扰您工作的同时，也能时刻陪伴。
- **智能提醒系统**：内置灵活的提醒调度器 (`ReminderScheduler`)，可根据配置的时间间隔或特定触发条件，推送不同主题的提醒气泡。
- **轻量化日志**：支持通过全局快捷键（默认为 `Alt+J`）随时唤起速记窗口，记录瞬间的想法。每日定时推送日报通知，并可查看包含 AI 摘要的日志报告。
- **模块化与可扩展**：主进程逻辑高度模块化，将窗口管理 (`windowManager`)、托盘管理 (`trayManager`)、提醒 (`reminderScheduler`) 及日志服务 (`journalScheduler`, `journalStore`) 等核心功能解耦，易于维护和扩展。
- **安全可靠**：采用 Electron 的 `preload.ts` 脚本作为渲染进程与主进程之间的安全桥梁，严格控制 API 暴露，确保应用稳定安全。
- **现代化的开发体验**：集成 Vite 提供毫秒级的热更新，代码库全面拥抱 TypeScript，并使用 Electron Forge 实现一键化构建与打包。

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (建议使用 v18 或更高版本)
- [npm](https://www.npmjs.com/)

### 安装与运行

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/tana-desktop-pet.git
    cd tana-desktop-pet
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发环境**
    ```bash
    npm run dev
    ```
    此命令将同时启动 Vite 开发服务器、TypeScript 编译器（监视模式）和 Electron 应用，并支持热重载。

## 🛠️ 开发脚本

项目 `package.json` 中提供了一系列脚本，以支持开发、构建和代码质量检查：

- `npm run dev`：启动完整的开发环境。
- `npm run build`：构建用于生产环境的前端和主进程代码。
- `npm run make`：在构建后，打包生成适用于当前平台的可分发安装程序。
- `npm run lint`：使用 ESLint 检查代码质量。
- `npm run format`：使用 Prettier 自动格式化代码。

## 📂 项目结构

```
.
├── assets/                  # 静态资源 (应用图标等)
├── src/
│   ├── main/                # Electron 主进程
│   │   ├── services/        # 日志相关服务 (调度、存储、AI摘要)
│   │   ├── config.ts        # 配置加载逻辑
│   │   ├── ipcHandlers.ts   # IPC 事件处理器
│   │   ├── main.ts          # 应用主入口
│   │   ├── preload.ts       # 预加载脚本 (安全桥梁)
│   │   ├── reminderScheduler.ts # 提醒调度器
│   │   ├── trayManager.ts   # 托盘菜单管理器
│   │   └── windowManager.ts # 窗口管理器
│   │
│   ├── renderer/            # 渲染进程 (Vue 3 UI)
│   │   ├── assets/          # 前端静态资源 (宠物动画)
│   │   ├── components/      # Vue 组件
│   │   ├── hooks/           # Composition API Hooks (UI 逻辑)
│   │   ├── views/           # 视图组件 (页面)
│   │   ├── App.vue          # 根组件
│   │   └── main.ts          # Vue 应用入口
│   │
│   └── shared/              # 主进程与渲染进程共享的类型和常量
│
├── forge.config.js          # Electron Forge 打包配置
└── package.json             # 项目依赖与脚本
```

## 🧩 配置说明

应用的核心行为由配置文件驱动。首次启动时，应用会将 `src/main/appConfig.json` (默认模板) 的内容复制到用户数据目录中（例如，Linux 上的 `~/.config/Tana/config/appConfig.json`）。之后所有的配置读取与修改都将基于此文件。

若要恢复默认配置，只需删除用户目录下的配置文件即可，应用下次启动时会自动重新生成。

### 主要配置项

- `reminders`: 配置不同的提醒模块，如 `daily`（日常提醒），可定义触发器、消息列表和冷却时间。
- `journal`: 配置日志功能，包括 `dailyReportTime`（日报推送时间）、`hotkey`（速记快捷键）以及 `ai`（AI 摘要服务的模型和 API Key）。
- `petWindow`: 配置宠物窗口的外观，如 `scale`（缩放比例）。

**注意**：更新配置后，需要重启应用才能生效。

## 🤝 贡献指南

我们欢迎任何形式的贡献！如果您希望参与项目，请遵循以下准则：

1.  **Fork 仓库** 并从 `main` 分支创建您的开发分支。
2.  **编码风格**: 请遵循项目已有的编码风格。运行 `npm run format` 以确保代码格式统一。
3.  **提交信息**: 请使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范编写提交信息。
4.  **AI Agent 开发**: 如果您是 AI Agent，请务必阅读 `AGENTS.md` 文件，它提供了详细的架构和开发规范。
5.  **发起 Pull Request**: 提交您的更改，并详细说明您所做的修改。

## 📄 许可证

本项目使用 [ISC License](./LICENSE)。

---

希望你和 Tana 相处愉快 🧡。
