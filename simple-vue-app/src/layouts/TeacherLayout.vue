<template>
  <div class="layout">
    <aside class="sidebar">
      <h3>教师端</h3>
      <nav>
        <router-link to="/teacher/attendance">今日考勤</router-link>
        <router-link to="/teacher/history">历史统计</router-link>
        <router-link to="/teacher/exceptions">异常复核</router-link>
      </nav>
      <button @click="logout" class="logout-btn">退出</button>
    </aside>
    <main class="content">
      <div class="greeting">👩‍🏫 老师，{{ greetingTime }}好</div>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
const logout = () => authStore.logout()
const greetingTime = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午'
  if (hour < 18) return '下午'
  return '晚上'
})
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #304156; color: white; padding: 20px; }
.sidebar h3 { margin-bottom: 30px; }
.sidebar a { display: block; color: #bfcbd9; padding: 10px 0; text-decoration: none; }
.sidebar a.router-link-active { color: #42b983; }
.logout-btn { margin-top: 40px; background: none; border: 1px solid #bfcbd9; color: #bfcbd9; padding: 8px; width: 100%; border-radius: 4px; cursor: pointer; }
.content { flex: 1; padding: 24px; background: #f0f2f5; }
.greeting { font-size: 20px; margin-bottom: 20px; color: #303133; }
</style>