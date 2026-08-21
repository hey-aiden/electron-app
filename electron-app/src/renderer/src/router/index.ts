import { createRouter, createWebHashHistory } from 'vue-router'

const HomePage = () => import('@client/page/home/index')
const ChatAI = () => import('@client/page/ai/index')
const DemoPage = () => import('@client/page/demo/index')

const routes = [
    {
        path: '/',
        component: HomePage
    },
    {
        path: '/ai-chat',
        name: 'AiChat',
        component: ChatAI
    },
    {
        path: '/demo',
        name: 'demo',
        component: DemoPage
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior() {
        // return 期望滚动到哪个的位置
        /** 始终滚动到顶部, 也可以返回 promise 延迟滚动 */
        return { top: 0 }
    }
})

export default router
