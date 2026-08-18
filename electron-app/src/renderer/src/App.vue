<template>
    <RouterView />
    <Versions />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Versions from './components/Versions.vue'

const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

console.log('页面加载成功', window.electronAPI)
window.electronAPI.onInitData((data) => {
    console.log('init-data: ', data)
})

onMounted(() => {
    ipcHandle()
})
</script>
