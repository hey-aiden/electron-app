<template>
    <div class="home-page">HOME PAGE</div>
    <div @click.stop="navDemo">DEMO-TEST</div>
    <div class="nav-btn" @click.stop="toChatAI">跳到聊天室</div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const toChatAI = () => {
    router.push({ name: 'AiChat' })
}

const navDemo = () => {
    router.push({ name: 'demo' })
}
</script>

<style lang="scss" scoped>
.nav-btn {
    cursor: pointer;
}
</style>
