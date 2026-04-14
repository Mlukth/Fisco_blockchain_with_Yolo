<template>
  <div></div>
</template>

<script setup>
import { onMounted } from 'vue'

// 请求通知权限（在适当时候调用）
async function requestPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') return
  if (Notification.permission !== 'denied') {
    await Notification.requestPermission()
  }
}

// 发送通知（例如：考勤异常告警）
function sendNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { icon: '/favicon.ico', ...options })
}

// 示例：轮询管理员告警（可选，可在外层调用）
onMounted(() => {
  // 可在 Dashboard 中调用 requestPermission 和 sendNotification
})

defineExpose({ requestPermission, sendNotification })
</script>