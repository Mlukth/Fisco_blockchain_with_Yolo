<template>
  <div class="container">
    <h2>孩子今日考勤</h2>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="children.length === 0" class="empty">暂无绑定孩子信息</div>
    <div v-else class="children-list">
      <div v-for="child in children" :key="child.anonymousId" class="status-card" :class="statusClass(child.attendance?.status)">
        <div class="child-name">{{ child.name }}</div>
        <div class="child-class">{{ child.class }}</div>
        <div class="status-icon">
          <span v-if="child.attendance?.status === 'present'">✅</span>
          <span v-else-if="child.attendance?.status === 'late'">⏰</span>
          <span v-else-if="child.attendance?.status === 'absent'">❌</span>
          <span v-else>❓</span>
        </div>
        <div class="status-text">{{ statusText(child.attendance?.status) }}</div>
        <div v-if="child.attendance?.time" class="status-time">{{ formatTime(child.attendance.time) }}</div>
        <router-link :to="`/parent/history?child=${child.anonymousId}`" class="view-history">查看本月记录 →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAttendance } from '@/api/parent'

const children = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getAttendance()
    children.value = res.data || []
  } finally {
    loading.value = false
  }
})

function statusClass(status) {
  if (status === 'present') return 'present'
  if (status === 'late') return 'late'
  if (status === 'absent') return 'absent'
  return 'unknown'
}

function statusText(status) {
  const map = { present: '已到校', late: '迟到', absent: '缺勤', leave: '请假' }
  return map[status] || '状态未知'
}

function formatTime(time) {
  return time ? new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''
}
</script>

<style scoped>
.children-list { display: flex; flex-wrap: wrap; gap: 20px; }
.status-card { background: white; border-radius: 20px; padding: 30px; width: 280px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; transition: 0.2s; }
.status-card.present { border-bottom: 6px solid #67c23a; }
.status-card.late { border-bottom: 6px solid #e6a23c; }
.status-card.absent { border-bottom: 6px solid #f56c6c; }
.status-card.unknown { border-bottom: 6px solid #909399; }
.child-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
.child-class { color: #909399; margin-bottom: 20px; }
.status-icon { font-size: 64px; margin-bottom: 10px; }
.status-text { font-size: 20px; font-weight: 500; margin-bottom: 10px; }
.status-time { color: #606266; margin-bottom: 20px; }
.view-history { color: #409eff; text-decoration: none; }
</style>