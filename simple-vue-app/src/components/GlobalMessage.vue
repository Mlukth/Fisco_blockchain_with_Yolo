<template>
  <Teleport to="body">
    <div class="message-container" v-if="messages.length">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="['message', msg.type]"
        @click="remove(msg.id)"
      >
        {{ msg.text }}
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const messages = ref([])
let idCounter = 0

function addMessage(text, type = 'info', duration = 3000) {
  const id = idCounter++
  messages.value.push({ id, text, type })
  setTimeout(() => remove(id), duration)
}

function remove(id) {
  messages.value = messages.value.filter(m => m.id !== id)
}

// 暴露给全局使用
defineExpose({ addMessage })
</script>

<style scoped>
.message-container { position: fixed; top: 80px; right: 20px; z-index: 2000; }
.message { padding: 12px 20px; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; transition: 0.2s; }
.message.info { background: #ecf5ff; color: #409eff; }
.message.success { background: #f0f9eb; color: #67c23a; }
.message.warning { background: #fdf6ec; color: #e6a23c; }
.message.error { background: #fef0f0; color: #f56c6c; }
</style>