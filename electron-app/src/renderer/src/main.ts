import './assets/main.css'

import { createApp } from 'vue'
import router from '@client/router/index'
import App from '@client/App.vue'

const app = createApp(App)

app.use(router)

app.mount('#app')
