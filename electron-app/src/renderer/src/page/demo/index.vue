<template>
    <CpuStats />
    <div class="ipc-add">
        <div>{{ count }}</div>
        <div @click.stop="increase">增加</div>
    </div>
    <div>user: {{ user }}</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

import CpuStats from '@client/components/CpuStats'

const count = ref(0)
const user = ref('')



onMounted(async () => {
    const prev = await window.electronAPI.getCount()
    console.log(prev)

    count.value = prev
})

const increase = async () => {
    count.value++
    await window.electronAPI.setCount(count.value)
}
</script>

<style lang="scss" scoped></style>
