<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const menu = [
  { path: '/parent/attendance', name: '孩子考勤', icon: '📅' },
  { path: '/parent/history', name: '历史记录', icon: '📋' },
]
</script>

<template>
  <div class="layout">
    <aside class="sidebar" style="background: linear-gradient(180deg, #667eea, #764ba2)">
      <div class="sidebar-header">👨‍👩‍👧 家长端</div>
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
          <span style="margin-right: 12px">{{ auth.user?.name }} 家长</span>
          <span class="tag tag-orange">家长</span>
          <button class="btn btn-default" style="margin-left: 12px" @click="auth.logout(); router.push('/login')">退出</button>
        </div>
      </header>
      <main class="content"><router-view /></main>
    </div>
  </div>
</template>
