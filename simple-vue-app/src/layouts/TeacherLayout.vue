<template>
  <div class="layout">
    <aside class="sidebar">
      <h3>教师端</h3>
      <nav>
        <router-link to="/teacher/attendance">今日考勤</router-link>
        <router-link to="/teacher/history">历史统计</router-link>
        <router-link to="/teacher/exceptions">异常复核</router-link>
      </nav>
      <button @click="logout">退出</button>
    </aside>
    <main><router-view /></main>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
const logout = () => authStore.logout()
</script>