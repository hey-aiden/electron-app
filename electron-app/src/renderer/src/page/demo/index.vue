<template>
    <div></div>
    <div class="ipc-add">
        <div>{{ count }}</div>
        <div @click.stop="increase">增加</div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const count = ref(0)

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
