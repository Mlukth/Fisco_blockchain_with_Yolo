<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const menuItems = [
  { path: '/admin/dashboard', label: '仪表盘', icon: '📊' },
  { path: '/admin/users', label: '用户管理', icon: '👥' },
  // 已移除系统配置菜单项，避免 404 错误
]

const activeMenu = computed(() => route.path)

const navigate = (path: string) => {
  router.push(path)
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <h2>🏫 智慧课堂</h2>
        <p>管理员控制台</p>
      </div>
      <nav class="nav">
        <div
          v-for="item in menuItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: activeMenu === item.path }"
          @click="navigate(item.path)"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="label">{{ item.label }}</span>
        </div>
      </nav>
      <div class="user-info">
        <span>{{ authStore.user?.username || 'admin' }}</span>
        <button class="logout-btn" @click="handleLogout">🚪 退出</button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 260px;
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  padding: 24px 0;
}

.logo {
  padding: 0 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}
.logo h2 {
  margin: 0;
  font-size: 20px;
  color: #1890ff;
}
.logo p {
  margin: 8px 0 0;
  font-size: 12px;
  color: #999;
}

.nav {
  flex: 1;
  padding: 20px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  color: #333;
}
.nav-item:hover {
  background: #f0f7ff;
  color: #1890ff;
}
.nav-item.active {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 500;
}
.icon {
  margin-right: 12px;
  font-size: 18px;
}
.label {
  font-size: 14px;
}

.user-info {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.logout-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}
.logout-btn:hover {
  background: #ff4d4f;
  color: white;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>