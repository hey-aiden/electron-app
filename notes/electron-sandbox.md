# 学习笔记：`sandbox: true` 导致 preload 加载失败，IPC 数据空白

> 记录日期：2026-08-18
> 相关仓库：electron-app（electron-vite 5 + Vue3 + TypeScript 脚手架）
> 状态：已修复（临时方案：`sandbox: false`）

## 一、现象

`CpuStats.vue` 组件里的 IPC（`window.electronAPI.getCpuStats()` / `getCpuStatus()`）数据**完全空白**；排查后发现不止 CPU 组件，所有用到 `window.electron` / `window.electronAPI` 的地方（`Versions.vue` 读 `window.electron.process.versions`、`demo/index.vue` 读 `window.electronAPI.onInitData`）全部抛错。

## 二、报错信息

开启 `ELECTRON_ENABLE_LOGGING=true` 跑 `pnpm dev`，终端捕获到：

```
Unable to load preload script: /Users/.../out/preload/index.js
Error: module not found: @electron-toolkit/preload
Uncaught TypeError: Cannot read properties of undefined (reading 'process')      // Versions.vue
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'onInitData')  // demo/index.vue
TypeError: Cannot read properties of undefined (reading 'getCpuStats')           // CpuStats.vue
```

在主进程加 `webContents.executeJavaScript` 探测，返回：

```json
{"hasElectron":"undefined","hasElectronAPI":"undefined","cpuStatsError":"Cannot read properties of undefined (reading 'getCpuStats')",...}
```

即 `window.electron` / `window.electronAPI` 都是 `undefined`——**preload 根本没暴露成功**。

## 三、排查过程（证据链）

1. 静态排查 IPC 链路：main 里 `ipcMain.handle('get-cpu-stats'/'get-cpu-status')` 已注册、preload 的 `invoke` channel 一一对应、renderer 调用正确 → 排除「某个 handler 没注册」。
2. 加临时诊断（`executeJavaScript` 探测 `typeof window.electron/electronAPI`）→ 两者都是 `undefined`，说明问题在 preload 暴露环节，而非 handler 内部。
3. 开 `ELECTRON_ENABLE_LOGGING` 跑 dev → 看到 `Unable to load preload script` + `Error: module not found: @electron-toolkit/preload`。
4. 读构建产物 `out/preload/index.js` → 第 3 行是 `const preload = require("@electron-toolkit/preload");`，**这个包没有被打包进 preload，而是留成了运行时 require**。
5. 查 electron-vite 5.0.0 源码（`dist/chunks/lib-q6ns0vZr.js`）确认：
   - `build.externalizeDeps` **默认 `true`**，会把 `package.json` 的 `dependencies` 全部 externalize（`externalizeDepsPlugin` 加到 `rollupOptions.external`）。
   - 所以 `@electron-toolkit/preload`（在 `dependencies` 里）被留成 `require(...)`，而非打进产物。
6. 回看近期改动：`src/main/index.ts` 的 `webPreferences.sandbox` 从 `false` 改成了 `true`（安全加固），这是触发点。

## 四、根因

两个机制叠加：

1. **`sandbox: true` 时，preload 运行在 Chromium OS 沙箱里**，`require` 只能加载 `electron` 和少量内置模块（`events` / `timers` / `url`），**无法加载任何 npm 包**。
2. **electron-vite 默认 `externalizeDeps: true`**，把 `@electron-toolkit/preload` 留成 `require("@electron-toolkit/preload")` 而没打包进 preload。

→ preload 一运行就 `module not found`，**整个 preload 脚本加载失败** → `contextBridge.exposeInMainWorld` 没执行 → `window.electron` / `window.electronAPI` 都是 `undefined` → renderer 所有调用点抛 `Cannot read properties of undefined` → IPC 数据空白。

> 之前 `sandbox: false` 时正常，是因为非沙箱 preload 有完整 Node 能力、能 `require` npm 包。

## 五、修复

### 临时方案（已采用）：`sandbox: false`

`src/main/index.ts` 的 `webPreferences`：

```ts
webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false, // preload 需 require('@electron-toolkit/preload')，沙箱下无法加载 npm 包
    webSecurity: true,
    allowRunningInsecureContent: false,
}
```

一行改动，验证通过：preload 成功加载、`window.electron`/`window.electronAPI` 为 object、`getCpuStats()`/`getCpuStatus()` 正常返回数据。

### 生产方案（想保留 `sandbox: true`）

**方案 A：把依赖打进 preload，消除运行时 require**（electron-vite 配置）：

```ts
// electron.vite.config.ts
export default defineConfig({
    main: {},
    preload: {
        build: {
            // 不把 dependencies 留成外部 require，而是打包进 preload
            externalizeDeps: false
            // 或更精确，只针对这个包：externalizeDeps: { exclude: ['@electron-toolkit/preload'] }
        }
    },
    renderer: { /* ... */ }
})
```

前提：被打包的依赖内部**只能 `require('electron')` 和 Node 内置模块**（`@electron-toolkit/preload` 满足，它只用 `require('electron')` + 惰性 `process.*`）。

**方案 B：preload 保持零依赖**，只用 `contextBridge` + `ipcRenderer` + `process.*`（这些沙箱可用），自己写最小桥接，不引入 `@electron-toolkit/preload`。这也是生产上更推荐的实践——preload 应该是「薄、可审计」的一层，重活放主进程。

## 六、知识点 / 备忘

- **沙箱 preload 的 require 白名单**：`sandbox: true` 下 preload 只能 `require('electron')` 和 `events`/`timers`/`url` 等内置模块，**任何 npm 包都会 `module not found`**。
- **electron-vite 默认 externalize 依赖**：`build.externalizeDeps` 默认 `true`，把 `dependencies` 全部留成运行时 `require`。想打包进去要用 `externalizeDeps: false` 或 `{ exclude: [...] }`。electron-vite 5.0.0 里 `externalizeDepsPlugin` 已标记 `@deprecated`，改用 `build.externalizeDeps` 配置项。
- **`sandbox: false` 是否影响安全**：有影响，但属于「纵深防御」损失而非主防线崩溃。
  - `contextIsolation: true` + `nodeIntegration: false` 仍是核心边界——renderer 的 JS 无法直接碰 Node/Electron API，只能走 preload 桥。
  - OS 沙箱是额外一层：即使 renderer 被 XSS / Chromium 0-day 打穿，也能限制其进程权限。关掉后，被攻破的 renderer 拥有接近主进程的 OS 权限。
  - 结论：对只加载本地可信内容的桌面应用，`sandbox: false` 可接受；加载远程/不可信内容时，应尽量保留沙箱并走上面的生产方案。
- **Electron 20 起渲染进程默认启用沙箱**，但 electron-vite 脚手架显式写 `sandbox: false`，正是为了配合「externalizeDeps + `@electron-toolkit/preload`」这套默认组合。
- **排障技巧**：
  - `ELECTRON_ENABLE_LOGGING=true pnpm dev` 能把 renderer 的 `console.log/error` 转发到终端，不用开 DevTools 就能看报错。
  - 在主进程用 `webContents.executeJavaScript(...)` 可直接探测 renderer 的全局状态（如 `typeof window.electronAPI`），快速区分「preload 没暴露」还是「handler 没注册/报错」。
  - 读构建产物（`out/preload/index.js`）能确认依赖到底是打包进去还是留成了 `require`。
