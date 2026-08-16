<template>
    <div>{{ count }}</div>
    <button @click.stop="increment">+</button>
    <button @click.stop="decrement">-</button>
    <p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
    <div class="actions">
        <div class="action">
            <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
        </div>
        <div class="action">
            <a target="_blank" rel="noreferrer" @click="ipcHandle">Send IPC</a>
        </div>
    </div>
    <div>
        <a href="https://www.baidu.com" target="_blank" rel="noreferrer">百度一下</a>
    </div>
    <Versions />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Versions from './components/Versions.vue'

const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

const count = ref(0)

onMounted(async () => {
    count.value = await window.electronAPI.getCount()
})

// 点击 + 按钮
async function increment(): Promise<void> {
    count.value = await window.electronAPI.setCount(count.value + 1)
}

// 点击 - 按钮
async function decrement(): Promise<void> {
    count.value = await window.electronAPI.setCount(count.value - 1)
}
</script>
