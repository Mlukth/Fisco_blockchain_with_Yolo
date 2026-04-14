<template>
  <div class="attendance-page">
    <div class="page-header">
      <h1 class="page-title">孩子今日考勤</h1>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="children.length === 0" class="empty-state">
      <span class="empty-icon">👨‍👩‍👧</span>
      <span class="empty-text">暂无绑定孩子信息</span>
      <span class="empty-hint">请联系学校管理员进行绑定</span>
    </div>

    <div v-else class="children-list">
      <div
        v-for="child in children"
        :key="child.anonymousId"
        class="status-card"
        :class="statusClass(child.attendance?.status)"
      >
        <div class="card-header">
          <div class="child-avatar">{{ child.name?.charAt(0) || '?' }}</div>
          <div class="child-info">
            <div class="child-name">{{ child.name }}</div>
            <div class="child-class">{{ child.class }}</div>
          </div>
        </div>

        <div class="card-body">
          <div class="status-icon-large">
            <span v-if="child.attendance?.status === 'present'">✅</span>
            <span v-else-if="child.attendance?.status === 'late'">⏰</span>
            <span v-else-if="child.attendance?.status === 'absent'">❌</span>
            <span v-else>❓</span>
          </div>
          <div class="status-text" :class="statusClass(child.attendance?.status)">
            {{ statusText(child.attendance?.status) }}
          </div>
          <div class="status-time" v-if="child.attendance?.time">
            打卡时间：{{ formatTime(child.attendance.time) }}
          </div>
          <div class="status-time" v-else>
            暂无打卡记录
          </div>
        </div>

        <div class="card-footer">
          <router-link :to="`/parent/history?child=${child.anonymousId}`" class="view-history">
            查看本月记录 →
          </router-link>
        </div>
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
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E6EB;
  border-top-color: #0066CC;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state span {
  color: #86909C;
  font-size: 14px;
}

.empty-icon {
  font-size: 64px;
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: #1D2129;
}

.empty-hint {
  font-size: 14px;
  color: #86909C;
}

.children-list {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.status-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  width: 320px;
  overflow: hidden;
  transition: all 0.3s;
}

.status-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}

.status-card.present {
  border-bottom: 6px solid #67C23A;
}

.status-card.late {
  border-bottom: 6px solid #E6A23C;
}

.status-card.absent {
  border-bottom: 6px solid #F56C6C;
}

.status-card.unknown {
  border-bottom: 6px solid #909399;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #F0F2F5;
}

.child-avatar {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.child-info {
  flex: 1;
}

.child-name {
  font-size: 20px;
  font-weight: 700;
  color: #1D2129;
}

.child-class {
  font-size: 14px;
  color: #86909C;
  margin-top: 2px;
}

.card-body {
  padding: 32px 24px;
  text-align: center;
}

.status-icon-large {
  font-size: 80px;
  margin-bottom: 16px;
}

.status-text {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.status-text.present {
  color: #67C23A;
}

.status-text.late {
  color: #E6A23C;
}

.status-text.absent {
  color: #F56C6C;
}

.status-text.unknown {
  color: #909399;
}

.status-time {
  font-size: 14px;
  color: #606266;
}

.card-footer {
  padding: 16px 24px;
  background: #F5F7FA;
  text-align: center;
}

.view-history {
  color: #0066CC;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.view-history:hover {
  color: #0052AA;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .children-list {
    flex-direction: column;
  }

  .status-card {
    width: 100%;
  }
}
</style>