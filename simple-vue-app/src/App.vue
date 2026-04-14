<template>
  <GlobalMessage ref="globalMsgRef" />
  <router-view />
</template>

<script setup>
import { ref, provide } from 'vue'
import GlobalMessage from '@/components/GlobalMessage.vue'

const globalMsgRef = ref(null)

// 提供全局消息方法
function showMessage(text, type = 'info', duration = 3000) {
  globalMsgRef.value?.addMessage(text, type, duration)
}

provide('showMessage', showMessage)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: 'Segoe UI', Roboto, system-ui, sans-serif;
  background: #f5f7fa;
}
.btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; background: white; border: 1px solid #dcdfe6; }
.btn-primary { background: #409eff; color: white; border: none; }
.btn-primary:hover { background: #66b1ff; }
.btn-warning { background: #e6a23c; color: white; border: none; }
.btn-warning:hover { background: #ebb563; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 20px; }
</style>