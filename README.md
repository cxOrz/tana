# Tana 桌面宠物

Tana 是一款常驻桌面的可爱史莱姆宠物，它能帮你提醒专注、收益、健康状态，还会偶尔送来惊喜。项目基于 Electron + Vue 3 + Pixi.js 构建，可一键打包成跨平台桌面应用。

## ✨ 核心特性

- **生动的桌面宠物**：基于 Pixi.js 渲染，拥有流畅的动画效果。窗口透明、无边框、始终置顶，确保 Tana 在不打扰您工作的同时，也能时刻陪伴。
- **智能提醒系统**：内置进度、收益、健康和惊喜四种提醒模块。提醒内容和触发条件高度可配置，让 Tana 成为您的专属小助手。
- **灵活的调度机制**：主进程中的 `ReminderScheduler` 统一管理所有提醒事件，支持按固定时间间隔、随机概率等多种策略进行调度。
- **安全可靠的进程通信**：采用 Electron 的 `preload.ts` 脚本，严格限制渲染进程可访问的 API，确保了主进程的安全性。
- **现代化的开发体验**：集成 Vite 实现毫秒级的热更新，代码库全面拥抱 TypeScript，并使用 Electron Forge 实现一键构建和打包。

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (建议使用 v18 或更高版本)
- [npm](https://www.npmjs.com/) (通常随 Node.js 一同安装)

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
    此命令会同时启动 Vite 开发服务器、TypeScript 编译器（监视模式）和 Electron 应用。

### 开发脚本说明

- `npm run dev`: 启动完整的开发环境。
- `npm run dev:vite`: 仅启动 Vite 前端开发服务器。
- `npm run dev:main`: 仅以监视模式编译主进程代码。
- `npm run dev:electron`: 在 Vite 准备就绪后启动 Electron 应用。

在开发模式下，您可以在浏览器的开发者工具中调用 `window.pushMockReminder()` 函数，手动触发一个提醒气泡，以方便调试样式和动画。

## 🛠️ 构建与分发

项目使用 Electron Forge 进行打包。

```bash
# 构建渲染进程和主进程代码到 dist/ 目录
npm run build

# 生成适用于当前平台的可执行文件
npm run package

# 构建并打包成可分发的安装程序 (例如 .dmg, .exe, .deb)
npm run make
```

构建产物位于 `out/` 目录。

## 📂 项目结构

```
.
├── assets/                  # 静态资源 (应用图标等)
├── src/
│   ├── main/                # Electron 主进程代码
│   │   ├── services/        # 主进程服务模块
│   │   ├── appConfig.json   # 默认提醒配置模板
│   │   ├── config.ts        # 配置加载逻辑
│   │   ├── main.ts          # 应用主入口
│   │   ├── preload.ts       # 预加载脚本
│   │   └── reminderScheduler.ts # 提醒调度器
│   ├── renderer/            # 渲染进程代码 (Vue 3)
│   │   ├── assets/          # 前端静态资源
│   │   ├── components/      # Vue 组件
│   │   ├── hooks/           # Composition API Hooks
│   │   ├── views/           # 视图组件
│   │   ├── App.vue          # 根组件
│   │   └── main.ts          # Vue 应用入口
│   └── shared/              # 共享类型定义
├── forge.config.js          # Electron Forge 打包配置
└── package.json             # 项目依赖与脚本
```

## 🧩 配置说明

应用的提醒功能由一个 JSON 文件驱动。首次启动时，应用会将 `src/main/appConfig.json` 的内容复制到用户数据目录中（例如，Linux 上的 `~/.config/Tana/config/appConfig.json`）。之后所有的配置读取和修改都将基于用户目录中的这个文件。

要恢复默认配置，只需删除用户目录下的配置文件，应用下次启动时会重新生成。

### 配置项示例

- `baseIntervalMinutes`: 调度器的基础轮询时间间隔（分钟）。
- `reminders`: 包含各类提醒的配置。
  - `progress`, `income`, `wellness`, `surprise` 等模块可以分别配置 `triggers` (触发器), `messages` (消息列表), 和 `cooldownMinutes` (冷却时间)。
- `incomeConfig`: `income` 模块专属，用于配置工作时段、时薪等。
- `randomStrategy`: `surprise` 模块专属，用于配置随机触发的策略。

更新配置后，需要重启应用才能生效。

## 🤝 贡献指南

我们欢迎任何形式的贡献！如果您希望参与项目，请遵循以下准则：

1.  **Fork 仓库** 并从 `main` 分支创建您的开发分支。
2.  **编码风格**: 请遵循项目已有的编码风格（TypeScript, 2 空格缩进, 使用分号）。
3.  **提交信息**: 请使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范编写提交信息，格式为 `type(scope): summary`。
4.  **AI Agent 开发**: 如果您是 AI Agent，请务必阅读 `AGENTS.md` 文件，以了解项目的架构和开发规范。
5.  **发起 Pull Request**: 提交您的更改，并详细说明您所做的修改。

## 📄 许可证

本项目使用 [ISC License](./LICENSE)。欢迎在保留来源的基础上进行二次开发。

---

祝你和 Tana 相处愉快 🧡。
