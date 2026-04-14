<template>
  <div class="layout">
    <header class="header">
      <div class="header-left">
        <span class="logo">📚</span>
        <span class="system-name">智慧课堂考勤系统</span>
      </div>
      <div class="header-right">
        <span class="greeting">👋 {{ greetingTime }}好，家长</span>
        <span class="role-tag parent">家长</span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </header>

    <div class="main-container">
      <aside class="sidebar">
        <div class="sidebar-title">👨‍👩‍👧 家长端</div>
        <nav class="nav-menu">
          <router-link to="/parent/attendance" class="nav-item">
            <span class="nav-icon">📅</span>
            <span class="nav-text">今日考勤</span>
          </router-link>
          <router-link to="/parent/history" class="nav-item">
            <span class="nav-icon">📋</span>
            <span class="nav-text">历史记录</span>
          </router-link>
        </nav>
        <button class="logout-btn-sidebar" @click="logout">退出登录</button>
      </aside>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const logout = () => {
  authStore.logout()
}

const greetingTime = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return '上午'
  if (hour < 18) return '下午'
  return '晚上'
})
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  height: 60px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E6EB;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 24px;
  line-height: 1;
}

.system-name {
  font-size: 16px;
  color: #1D2129;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.greeting {
  font-size: 14px;
  color: #4E5969;
}

.role-tag {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.role-tag.parent {
  background: #FFF7E6;
  color: #FA8C16;
}

.logout-btn {
  padding: 6px 16px;
  border: 1px solid #E5E6EB;
  background: transparent;
  color: #4E5969;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.logout-btn:hover {
  color: #0066CC;
  background: #EEF7FF;
  border-color: #0066CC;
}

.main-container {
  display: flex;
  flex: 1;
}

.sidebar {
  width: 200px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin: 10px;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  padding: 0 16px 16px;
  margin-bottom: 8px;
  border-bottom: 1px solid #F0F2F5;
  font-size: 16px;
  font-weight: 600;
  color: #1D2129;
}

.nav-menu {
  flex: 1;
  padding: 0 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  text-decoration: none;
  color: #333333;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #F5F7FA;
}

.nav-item.router-link-active {
  background: #EEF7FF;
  color: #0066CC;
  box-shadow: 0 2px 6px rgba(0, 102, 204, 0.1);
}

.nav-icon {
  font-size: 18px;
}

.logout-btn-sidebar {
  margin: 16px;
  padding: 10px;
  border: 1px solid #FA8C16;
  background: transparent;
  color: #FA8C16;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.logout-btn-sidebar:hover {
  background: #FA8C16;
  color: white;
}

.content {
  flex: 1;
  padding: 10px;
  background: #F5F7FA;
  overflow-y: auto;
}
</style>