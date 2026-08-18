/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

// 允许不带 .vue 后缀导入页面组件，如 import('@client/page/home/index')
// 注意：@client/page/* 只会命中「未被 paths 解析到的模块」，不会遮蔽 .ts 文件。
declare module '@client/page/*' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module '@client/*' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}
