<template>
  <div class="layout">
    <aside class="sidebar">
      <h3>管理后台</h3>
      <nav>
        <router-link to="/admin/dashboard">仪表盘</router-link>
        <router-link to="/admin/devices">设备管理</router-link>
        <router-link to="/admin/users">用户管理</router-link>
      </nav>
      <button @click="logout" class="logout-btn">退出</button>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
const logout = () => authStore.logout()
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #304156; color: white; padding: 20px; }
.sidebar h3 { margin-bottom: 30px; }
.sidebar a { display: block; color: #bfcbd9; padding: 10px 0; text-decoration: none; }
.sidebar a.router-link-active { color: #42b983; }
.logout-btn { margin-top: 40px; background: none; border: 1px solid #bfcbd9; color: #bfcbd9; padding: 8px; width: 100%; border-radius: 4px; cursor: pointer; }
.content { flex: 1; padding: 24px; background: #f0f2f5; }
</style>