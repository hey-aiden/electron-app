import { createRouter, createWebHashHistory } from 'vue-router'

const HomePage = () => import('@client/page/home/index')

const routes = [
    {
        path: '/',
        component: HomePage
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        // return 期望滚动到哪个的位置
        /** 始终滚动到顶部, 也可以返回 promise 延迟滚动 */
        return { top: 0 }
    }
})

export default router
