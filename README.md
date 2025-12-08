# Tana — 会呼吸的桌面伴侣

有时候，我们只是需要一个安静的陪伴。Tana 将一只可爱的史莱姆带到您的桌面，它会默默地呼吸、发呆，在您需要的时候，给予恰到好处的提醒和记录支持。

它不仅仅是一个应用，更像是一个与您共同成长的数字生命。

项目基于 **Electron + Vue 3 + Pixi.js** 构建，确保了生动的动画效果与跨平台的流畅体验。

<!-- 建议替换为一张展示宠物、提醒气泡和日报窗口同框的 GIF 动图 -->
![Tana 截图](https://raw.githubusercontent.com/your-username/tana-desktop-pet/main/assets/screenshot.png)

## 🌟 Tana 为何与众不同？

- **无干扰的陪伴感**
  Tana 始终保持透明、无边框的置顶状态，静静地待在您的桌面上，不会打断您的工作流。它是一个安静的伙伴，当您需要专注时，它绝不多言；当您稍作喘息时，一瞥之间，总能看到它可爱的身影。

- **建立健康的工作节奏**
  我们相信“提醒”不应是冰冷的通知。Tana 的提醒系统旨在帮助您建立健康的节奏感——无论是站起来活动一下、喝杯水，还是仅仅让眼睛休息片刻。这些提醒以柔和的气泡形式出现，您可以轻松忽略，也可以在完成时微笑着将它关闭。

- **即时捕捉，智能回顾**
  灵感稍纵即逝。通过全局快捷键（默认为 `Alt+J`），您可以随时唤出一个极简的窗口，迅速记下任何想法。更强大的是，在一天结束时，Tana 可以利用 AI 为您当天的所有记录生成一份温暖而富有洞察力的总结，将零散的碎片编织成有意义的回忆。

## 🚀 快速上手

### 环境要求

- [Node.js](https://nodejs.org/) (v18 或更高版本)
- [npm](https://www.npmjs.com/)

### 安装与运行

1.  **克隆项目**
    ```bash
    git clone https://github.com/your-username/tana-desktop-pet.git
    cd tana-desktop-pet
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **启动开发**
    ```bash
    npm run dev
    ```
    应用将以开发模式启动，并享受 Vite 带来的毫秒级热更新体验。

## 🛠️ 开发与构建脚本

- `npm run dev`：启动完整的开发环境。
- `npm run build`：构建生产版本。
- `npm run make`：构建并打包为可分发的安装程序。
- `npm run lint`：检查代码质量。
- `npm run format`：自动格式化所有代码。

## 📂 项目结构解析

```
.
├── src/
│   ├── main/                # Electron 主进程 (核心后端逻辑)
│   │   ├── services/        # 日志相关服务 (调度、存储、AI摘要)
│   │   ├── config.ts        # 配置加载
│   │   ├── main.ts          # 应用主入口
│   │   ├── preload.ts       # 安全的进程间通信桥梁
│   │   ├── reminderScheduler.ts # 提醒调度器
│   │   ├── trayManager.ts   # 托盘菜单管理
│   │   └── windowManager.ts # 窗口管理
│   │
│   ├── renderer/            # 渲染进程 (Vue 3 UI)
│   │   ├── hooks/           # 可复用的 UI 逻辑 (Composition API)
│   │   └── views/           # 页面级组件
│   │
│   └── shared/              # 共享的类型与常量
│
└── forge.config.js          # Electron Forge 打包配置
```

## 🧩 轻松配置

Tana 的所有核心功能都支持自定义。首次启动后，一份详细的配置文件 `appConfig.json` 将被创建在您的用户数据目录中（例如，在 Linux 上位于 `~/.config/Tana/config/`）。

您可以修改此文件来：
- 调整提醒的**频率**和**内容**。
- 更改日志速记的**快捷键**。
- 配置生成 AI 摘要所用的**模型**和 **API Key**。
- 调整宠物窗口的**大小**。

**注意**：配置修改后，需重启应用才能生效。

## 🤝 欢迎贡献

这是一个充满爱意的项目，我们欢迎任何形式的贡献，无论是代码实现、功能建议还是文档优化。

- **技术栈**：项目采用 TypeScript、Vue 3 和 Electron 等现代化技术，代码结构清晰，易于上手。
- **Agent 开发**：如果您是 AI Agent，请务必阅读 `AGENTS.md`，其中包含了为高效协作而制定的详细规范。
- **贡献流程**：请 Fork 仓库，创建您的特性分支，并在提交前确保代码已通过格式化和 Lint 检查。我们期待您的 Pull Request！

## 📄 许可证

本项目基于 [ISC License](./LICENSE) 开源。
