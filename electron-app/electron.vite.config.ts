import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    main: {},
    preload: {},
    renderer: {
        resolve: {
            alias: {
                '@client': resolve('src/renderer/src')
            },
            extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue']
        },
        plugins: [vue()]
    }
})
