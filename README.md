# Tana 桌面宠物

Tana 是一款基于 Electron、Vue 3 和 Pixi.js 构建的开源桌面宠物应用。它提供可配置的提醒功能和本地日志系统。

## 核心功能

- **桌面宠物界面**: 在桌面上渲染一个动画角色。窗口透明、无边框且始终置顶。
- **提醒系统**: 根据用户在 `config.json` 中的配置推送通知。提醒以临时气泡的形式在宠物窗口内显示。
- **日志功能**:
  - **快速输入**: 通过全局热键（默认为 `Alt+J`）打开一个专用窗口进行快速文本输入。
  - **日报**: 日志条目按日期存储在本地，并可在报告窗口中查看。
  - **AI 摘要**: 可选功能，能使用可配置的外部 AI 服务（如 OpenRouter）为日志条目生成每日摘要。

## 快速上手

### 环境要求

- Node.js (v18 或更高版本)
- npm

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

3.  **以开发模式运行**
    ```bash
    npm run dev
    ```

## 开发脚本

- `npm run dev`: 启动带热重载的开发环境。
- `npm run build`: 构建用于生产的应用。
- `npm run make`: 构建并打包应用为可分发的安装程序。
- `npm run lint`: 使用 ESLint 进行代码检查。
- `npm run format`: 使用 Prettier 格式化代码库。

## 项目结构

```
.
├── src/
│   ├── main/                # Electron 主进程
│   │   ├── services/        # 日志相关服务 (调度、存储、AI摘要)
│   │   ├── config.ts        # 配置加载
│   │   ├── main.ts          # 应用入口点
│   │   ├── preload.ts       # 安全的 IPC 桥梁
│   │   ├── reminderScheduler.ts # 提醒调度器
│   │   ├── trayManager.ts   # 托盘菜单管理器
│   │   └── windowManager.ts # 窗口管理器
│   │
│   ├── renderer/            # 渲染器进程 (Vue 3 UI)
│   │   ├── hooks/           # 可复用的 UI 逻辑 (Composition API)
│   │   └── views/           # 页面级组件
│   │
│   └── shared/              # 共享的类型与常量
│
└── forge.config.js          # Electron Forge 打包配置
```

## 配置

应用的行为由 `config.json` 控制。首次启动时，一个默认配置将被复制到用户的主目录中（例如 `~/.tana/config.json`）。后续的更改应在此文件上进行。

关键可配置选项包括：
- 提醒的频率、内容和触发器。
- 日志的热键和 AI 摘要提供商设置（API 密钥、模型）。
- 宠物窗口的缩放比例。

**注意**: 应用必须重启才能使配置更改生效。

## 贡献

欢迎参与贡献。请遵守现有的代码风格和约定。对于 AI Agent 开发，请参阅 `AGENTS.md` 文件以获取详细指南。

## 许可证

本项目采用 [ISC 许可证](./LICENSE)。
