# 学习笔记：pnpm dev 启动失败 —— pnpm 11 拦截构建脚本

> 记录日期：2026-08-13
> 相关仓库：electron-app（electron-vite + Vue3 + TypeScript 脚手架）
> 状态：已修复（方案 B）

## 一、现象

运行 `pnpm dev` 启动 Electron 应用，启动失败并报错。

## 二、报错信息

```
. postinstall$ electron-builder install-app-deps
. postinstall: Done
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: electron-winstaller@5.4.0, electron@39.8.10, esbuild@0.25.12, esbuild@0.28.2

Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
[ERROR] Command failed with exit code 1: pnpm install
pnpm: Command failed with exit code 1: pnpm install
    at runDepsStatusCheck ...
    at runPnpmCli ...
```

## 三、排查过程（证据链）

1. `pnpm dev` 实际执行 `electron-vite dev`。electron-vite 启动前会先做 **deps status check**，内部调用 `pnpm install`。
2. 该 install 中，根项目自己的 `.postinstall`（`electron-builder install-app-deps`）正常执行并完成（日志里的 `. postinstall: Done`）。
3. 但 pnpm 随后检测到 4 个**依赖**的 postinstall 被拦截，抛 `ERR_PNPM_IGNORED_BUILDS` 并以 exit code 1 终止 → dev 直接失败。
4. 进一步检查：
   - `node_modules/electron/dist/` 不存在、`node_modules/electron/path.txt` 不存在 → Electron 二进制从未被下载。
   - `pnpm config get allowBuilds` 返回的是占位符字符串，不是布尔值。

## 四、根因

- **pnpm 10+ 的安全机制**：默认拦截所有依赖的生命周期脚本（postinstall/install 等），需要显式白名单放行。本机安装的是 pnpm 11.18.0。
- `pnpm-workspace.yaml` 里的 `allowBuilds` 白名单字段，值写成了模板占位符字符串 `"set this to true or false"`，而非真正的布尔值 `true`/`false`。
- 字段名是对的，**值错了**。pnpm 不会把字符串当 `true` 处理，相当于「未授权」。
- 连锁后果：`electron` 的 postinstall（负责下载 Electron 二进制）从未执行 → 二进制缺失 → dev 无法启动。`esbuild` 同理（0.25.12 与 0.28.2 两个版本）。

## 五、修复（方案 B）

手改 `pnpm-workspace.yaml`，把占位符改成真布尔值：

```yaml
allowBuilds:
  electron: true
  electron-winstaller: true
  esbuild: true
```

然后重新执行 `pnpm install`，让 `electron` 的 postinstall 真正执行并下载二进制，再运行 `pnpm dev`。

## 六、知识点 / 备忘

- **pnpm 10+ 默认拦截依赖 build script**，白名单字段有两个形态：
  - `allowBuilds`（pnpm 11，map 形式：`包名 → true/false`）
  - `onlyBuiltDependencies`（pnpm 10，数组形式：`[electron, esbuild, ...]`）
- 其他修复方式：运行 `pnpm approve-builds` 交互式勾选要放行的包。
- 排障命令：
  - `pnpm config get allowBuilds` —— 查看当前白名单配置
  - `ls node_modules/electron/dist/` 或 `cat node_modules/electron/path.txt` —— 判断 Electron 二进制是否已下载
- 排障直觉：看到 `ERR_PNPM_IGNORED_BUILDS`，第一时间查 `pnpm-workspace.yaml` / `package.json` 里的 pnpm 构建白名单配置，而不是急着看 Electron 代码。
- 常见诱因：脚手架模板生成 `allowBuilds` 时残留占位符（`create-electron-vite` 一类模板），初始化后未回填。


## 设置镜像

### 设置 Electron 下载镜像
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

### 同时设置 esbuild 镜像
export ESBUILD_BINARY_PATH_MIRROR="https://npmmirror.com/mirrors/esbuild/"

### 然后重新安装
pnpm install