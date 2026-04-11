<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const menu = [
  { path: '/admin/dashboard', name: '系统首页', icon: '🏠' },
  { path: '/admin/users', name: '用户管理', icon: '👥' },
  { path: '/admin/devices', name: '设备管理', icon: '📱' },
  { path: '/admin/config', name: '系统配置', icon: '⚙️' },
  { path: '/admin/diagnosis', name: '系统诊断', icon: '🔧' },
]
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">📊 管理员控制台</div>
      <nav>
        <router-link v-for="m in menu" :key="m.path" :to="m.path" v-slot="{ isActive }">
          <div :class="{ active: isActive }">{{ m.icon }} {{ m.name }}</div>
        </router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="header">
        <span>智慧课堂考勤系统</span>
        <div>
          <span style="margin-right: 12px">{{ auth.user?.name }}</span>
          <span class="tag tag-blue">管理员</span>
          <button class="btn btn-default" style="margin-left: 12px" @click="auth.logout(); router.push('/login')">退出</button>
        </div>
      </header>
      <main class="content"><router-view /></main>
    </div>
  </div>
</template>
