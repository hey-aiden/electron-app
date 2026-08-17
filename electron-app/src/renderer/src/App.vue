<template>
    <RouterView />
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
