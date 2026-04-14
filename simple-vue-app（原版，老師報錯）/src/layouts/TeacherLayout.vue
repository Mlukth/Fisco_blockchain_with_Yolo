<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const menu = [
  { path: '/teacher/class', name: '班级考勤', icon: '📅' },
  { path: '/teacher/history', name: '历史统计', icon: '📊' },
  { path: '/teacher/review', name: '异常复核', icon: '⚠️' },
]
</script>

<template>
  <div class="layout">
    <aside class="sidebar" style="background: #1890ff">
      <div class="sidebar-header">👨‍🏫 教师端</div>
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
          <span class="tag tag-green">教师</span>
          <button class="btn btn-default" style="margin-left: 12px" @click="auth.logout(); router.push('/login')">退出</button>
        </div>
      </header>
      <main class="content"><router-view /></main>
    </div>
  </div>
</template>
