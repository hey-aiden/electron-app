# 学习笔记：Vue 文件无后缀导入报「找不到模块」/ TS 类型声明报错

> 记录日期：2026-08-17
> 相关仓库：electron-app（electron-vite + Vue3 + TypeScript 脚手架）
> 状态：已修复

## 一、现象

在 `src/renderer/src/router/index.ts` 里用**不带 `.vue` 后缀**的方式动态导入页面组件：

```ts
const HomePage = () => import('@client/page/home/index')
```

编辑器（VSCode）报错：

> 找不到模块“@client/page/home/index”或其相应的类型声明。ts(2307)

## 二、报错信息

```
src/renderer/src/router/index.ts(3,31): error TS2307: Cannot find module '@client/page/home/index' or its corresponding type declarations.
```

同一时期 `@client/router/index`（`.ts`，无后缀）与 `@client/App.vue`（`.vue`，带后缀）都能正常解析，唯独**无后缀的 `.vue` 导入**报错。

## 三、排查过程（证据链）

1. 项目此前把路径别名从 `@renderer` 重命名成了 `@client`：`electron.vite.config.ts` 和源码（`main.ts`、`router/index.ts`）都改了，但 `tsconfig.web.json` 的 `paths` 还停留在 `@renderer/*` → 于是**所有 `@client/*` 导入**一开始都报「找不到模块」。
2. 把 `tsconfig.web.json` 的 `paths` 改成 `@client/*` 后，`@client/router/index` 与 `@client/App.vue` 的报错消失，只剩 `@client/page/home/index`（无后缀 `.vue`）仍报错。
3. 首次尝试：给 `paths` 追加一个 `.vue` 兜底映射 `"@client/*": ["src/renderer/src/*", "src/renderer/src/*.vue"]`。`vue-tsc` CLI 通过，但**编辑器重启后仍报错**。
4. 定位到关键差异：
   - `vue-tsc`（Volar 的 CLI）用 Volar 打过补丁的解析器，能识别 `paths` 映射出来的 `.vue` 文件；
   - 编辑器里 `router/index.ts` 是**普通 `.ts` 文件**，由原生 TypeScript 语言服务解析，它**不会**把 `.vue` 当可解析扩展名，也不认 `paths` → `.vue` 这种兜底；
   - `env.d.ts` 里原来的 `declare module '*.vue'` 通配声明，**只能匹配以 `.vue` 结尾的路径**，匹配不到 `@client/page/home/index` 这种无后缀路径。
5. 最终方案：改用**环境模块声明（ambient module declaration）**显式声明无后缀的页面模块——这是纯 TS 语法，编辑器与 CLI 解析行为一致，不再依赖 Volar 特有能力。

## 四、根因

- TypeScript 的 `moduleResolution: bundler` 自动补全的扩展名列表（`.ts/.tsx/.d.ts/.js/.jsx/.json`）**不包含 `.vue`**，所以无后缀的 `.vue` 路径无法被原生 TS 解析器命中。
- `declare module '*.vue'` 通配只匹配**带 `.vue` 后缀**的说明符，救不了无后缀导入。
- `paths` 里写 `src/renderer/src/*.vue` 的兜底技巧只在 Volar 的 CLI（`vue-tsc`）里生效，编辑器的原生 TS 语言服务不认 → 导致「CLI 通过、编辑器仍报错」的分裂现象。
- 前置问题：别名重命名后 `tsconfig.web.json` 的 `paths` 未同步，是另一处独立的报错来源。

## 五、修复

**1. `src/renderer/src/env.d.ts`** —— 用环境模块声明兜底无后缀的页面导入，并顺手把 `*.vue` 声明从空声明升级为带 `DefineComponent` 类型：

```ts
/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

// 允许不带 .vue 后缀导入页面组件，如 import('@client/page/home/index')
declare module '@client/page/*' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}
```

要点：`@client/page/*` 的 `*` 会匹配含斜杠的剩余路径（`home/index`），所以能命中 `@client/page/home/index`。环境声明只在 `paths` 解析失败时兜底，不会遮蔽 `.ts` 文件（`paths` 命中真实文件时优先走文件解析）。

**2. `tsconfig.web.json`** —— `paths` 回退成干净的别名映射：

```json
"paths": { "@client/*": ["src/renderer/src/*"] }
```

**3.（可选但建议）`electron.vite.config.ts`** —— 运行/构建侧让 Vite 支持无后缀 `.vue`，用「追加」而非「覆盖」扩展名列表：

```ts
extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue']
```

## 六、知识点 / 备忘

- **TS 无法原生解析无后缀 `.vue`**：`moduleResolution: bundler` 的扩展名补全列表不含 `.vue`；`declare module '*.vue'` 只匹配带后缀的说明符。
- **`paths` → `*.vue` 兜底映射是坑**：只在 `vue-tsc`（Volar CLI）生效，编辑器的原生 TS 语言服务不认，会出现「CLI 通过、编辑器报错」的假象。要编辑器也通过，得用**环境模块声明 `declare module 'xxx/*'`**。
- **环境声明 `declare module 'foo/*'` 的 `*` 能匹配斜杠**：`declare module '@client/page/*'` 可命中 `@client/page/home/index`。
- **环境声明与 `paths` 的优先级**：`paths` 命中真实文件时优先；文件解析失败才回落环境声明。所以 `@client/*` 这类声明不会遮蔽真实 `.ts` 文件。
- **改完 `env.d.ts` / `tsconfig` 后，编辑器要重载语言服务**：`Cmd+Shift+P` → `TypeScript: Restart TS Server`（或 `Vue: Restart Vue Server`），否则缓存导致报错残留。
- **别名重命名要同步三处**：`electron.vite.config.ts`（构建/运行）、`tsconfig.web.json`（类型）、源码 import。
- **`resolve.extensions` 是覆盖不是追加**：Vite 里写 `extensions: ['.vue', '.ts']` 会丢掉默认的 `.js/.json/.mjs` 等，正确做法是在默认列表末尾追加 `.vue`。
- 通配声明的作用域要按目录收窄（如 `@client/page/*`），避免用 `@client/*` 把 `.ts` 导入的打字错误也静默兜成 `any`；新增目录（`components/` 等）做无后缀导入时需补对应声明。
