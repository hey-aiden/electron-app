# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库结构

本仓库根目录（本文件所在层级）是 git 仓库根。实际应用代码位于子目录 `electron-app/` 下。`notes/` 目录存放学习/排障笔记（见下方「笔记规则」）。

## 包管理器

使用 **pnpm**（存在 `pnpm-workspace.yaml` 与 `pnpm-lock.yaml`）。`package.json` 里的脚本虽然写的是 `npm run`，但日常用 `pnpm` 执行等效命令，例如 `pnpm dev`。

环境注意事项：pnpm 10+ 默认拦截依赖的构建脚本，本仓库已在 `pnpm-workspace.yaml` 的 `allowBuilds` 中放行 `electron`、`electron-winstaller`、`esbuild`。若遇到 `ERR_PNPM_IGNORED_BUILDS`，先查该白名单（详见 `notes/environment.md`）。

## 常用命令

在 `electron-app/` 目录下执行：

```bash
pnpm install        # 安装依赖（会触发 electron-builder install-app-deps）
pnpm dev            # 启动开发模式（electron-vite dev，含 renderer HMR）
pnpm build          # 类型检查 + 构建（typecheck 后 electron-vite build）
pnpm start          # 预览已构建产物（electron-vite preview）
pnpm lint           # eslint --cache .
pnpm format         # prettier --write .
pnpm typecheck      # node 侧 tsc + web 侧 vue-tsc 双重类型检查
pnpm typecheck:node # 仅主进程/preload（tsconfig.node.json）
pnpm typecheck:web  # 仅渲染进程（tsconfig.web.json）
pnpm build:mac      # 打包 macOS（--win / --linux 同理）
pnpm build:unpack   # 打包但不生成安装包（--dir）
```

没有测试脚本（无 vitest/jest），也没有对应的单测命令。

## 架构

这是基于 **electron-vite** 的 Electron 应用，三进程结构由 `electron.vite.config.ts` 驱动，各进程有独立的 TypeScript 工程：

- **主进程** `electron-app/src/main/index.ts` —— 创建 `BrowserWindow`、注册 `ipcMain`、处理应用生命周期（`app.whenReady`、`window-all-closed`、macOS `activate`）。dev 时加载 `ELECTRON_RENDERER_URL`，生产时 `loadFile` 渲染进程产物。
- **预加载** `electron-app/src/preload/index.ts` —— 唯一通过 `contextBridge` 暴露 API 的地方。当前暴露 `window.electron`（`@electron-toolkit/preload` 的 `electronAPI`）和空的 `window.api`。新增渲染进程可用的能力都要在这里加。
- **渲染进程** `electron-app/src/renderer/` —— Vue 3 + TypeScript，入口 `src/main.ts`，根组件 `src/App.vue`。路径别名 `@renderer` → `src/renderer/src`（在 `electron.vite.config.ts` 与 `tsconfig.web.json` 中分别配置）。

**IPC 数据流**：renderer 通过 `window.electron.ipcRenderer.send('ping')` 发消息 → preload 的 `contextBridge` 桥接 → main 的 `ipcMain.on('ping', ...)` 处理。新增双向通信时沿这条链路改三处。

**类型检查分两层**：`tsconfig.node.json` 覆盖 main/preload（含 `electron-vite/node` 类型），`tsconfig.web.json` 覆盖 renderer（含 `.vue` 与 `preload/*.d.ts`）。preload 暴露的全局类型在 `src/preload/index.d.ts` 中声明（`Window.electron` / `Window.api`）。

## 笔记规则

排障、踩坑、环境配置等经验，**默认记录到仓库根目录 `notes/` 下**（不是 `electron-app/`），并按 case 类型拆分文件：

- 环境/依赖/build 脚本相关 → `notes/environment.md`
- 其他类型按需新建对应的 `<type>.md`（如 `build.md`、`ipc.md`）

规则：
- 每条笔记包含：现象 → 报错信息 → 排查过程（证据链）→ 根因 → 修复 → 知识点/备忘。
- 同一类型的新 case 追加到已有的 `notes/<type>.md` 里，不要为单个 case 新建散文件。
- 记录时注明记录日期与相关仓库/目录。
