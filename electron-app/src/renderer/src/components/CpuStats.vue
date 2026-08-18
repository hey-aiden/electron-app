<template>
    <h3>cpuInfo:</h3>
    <div>{{ cpuInfo }}</div>
    <h3>cpuStatus:</h3>
    <p>{{ cpuStatus }}</p>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const cpuInfo = ref<string>('')
const cpuStatus = ref<string>('')

onMounted(() => {
    syncCpuStats()
})

const syncCpuStats = () => {
    setTimeout(async () => {
        try {
            cpuInfo.value = await window.electronAPI.getCpuStats()
            cpuStatus.value = await window.electronAPI.getCpuStatus()
        } catch (e) {
            console.log(e)
        }
        syncCpuStats()
    }, 3000)
}
</script>
<style lang="scss" scoped></style>
