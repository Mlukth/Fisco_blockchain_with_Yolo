<template>
  <div class="attendance-page">
    <div class="page-header">
      <h1 class="page-title">孩子今日考勤</h1>
    </div>

    <div v-if="children.length === 0" class="empty-state">
      <span class="empty-icon">👨‍👩‍👧</span>
      <span class="empty-text">暂无绑定孩子，请联系管理员</span>
    </div>

    <div v-else class="cards-container">
      <div 
        v-for="child in children" 
        :key="child.anonymousId" 
        class="child-card"
        :class="cardBorderClass(child.attendance?.status)"
      >
        <div class="card-header">
          <div class="avatar" :style="{ background: avatarColor(child.name) }">
            {{ child.name.charAt(0) }}
          </div>
          <div class="info">
            <div class="name">{{ child.name }}</div>
            <div class="class">{{ child.class }}</div>
          </div>
        </div>

        <div class="card-body">
          <div class="status-icon">
            <span v-if="child.attendance?.status === 'present'">✅</span>
            <span v-else-if="child.attendance?.status === 'late'">⏰</span>
            <span v-else-if="child.attendance?.status === 'absent'">❌</span>
            <span v-else-if="child.attendance?.status === 'leave'">📝</span>
            <span v-else>❓</span>
          </div>
          <div class="status-text">
            {{ statusText(child.attendance?.status) }}
          </div>
          <div class="time" v-if="child.attendance?.time">
            {{ formatTime(child.attendance.time) }}
          </div>
          <div class="time" v-else>
            暂无打卡记录
          </div>
          
          <!-- 区块链存证标签 -->
          <div class="chain-status">
            <span v-if="child.attendance?.verified" class="chain-badge verified" title="该记录已上链存证">
              🔒 已存证
            </span>
            <span v-else-if="child.attendance?.merkleRoot" class="chain-badge warning" title="存证异常，请关注">
              ⚠️ 异常
            </span>
            <span v-else class="chain-badge pending" title="尚未进行链上存证">
              ⏳ 待存证
            </span>
          </div>
        </div>

        <div class="card-footer">
          <router-link :to="{ path: '/parent/history', query: { child: child.anonymousId } }" class="history-link">
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

onMounted(async () => {
  const res = await getAttendance()
  children.value = res.data
})

function statusText(status) {
  const map = { present: '出勤', late: '迟到', absent: '缺勤', leave: '请假', unknown: '未知' }
  return map[status] || '未知'
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function cardBorderClass(status) {
  const map = { present: 'border-present', late: 'border-late', absent: 'border-absent', leave: 'border-leave' }
  return map[status] || 'border-unknown'
}

function avatarColor(name) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const index = name ? name.charCodeAt(0) % colors.length : 0
  return colors[index]
}
</script>

<style scoped>
.attendance-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  background: white;
  border-radius: 12px;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: 16px;
  color: #86909C;
}

.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.child-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.2s;
  border-left: 6px solid #E5E6EB;
}

.child-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.child-card.border-present {
  border-left-color: #67C23A;
}
.child-card.border-late {
  border-left-color: #E6A23C;
}
.child-card.border-absent {
  border-left-color: #F56C6C;
}
.child-card.border-leave {
  border-left-color: #909399;
}
.child-card.border-unknown {
  border-left-color: #C0C4CC;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 20px 20px 16px;
  gap: 16px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 500;
  color: white;
}

.info {
  flex: 1;
}

.name {
  font-size: 18px;
  font-weight: 600;
  color: #1D2129;
  margin-bottom: 4px;
}

.class {
  font-size: 14px;
  color: #86909C;
}

.card-body {
  padding: 0 20px 20px;
  text-align: center;
}

.status-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.status-text {
  font-size: 20px;
  font-weight: 600;
  color: #1D2129;
  margin-bottom: 4px;
}

.time {
  font-size: 14px;
  color: #86909C;
  margin-bottom: 12px;
}

.chain-status {
  margin-top: 8px;
}

.chain-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.chain-badge.verified {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.chain-badge.warning {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}
.chain-badge.pending {
  background: #f5f5f5;
  color: #757575;
  border: 1px solid #e0e0e0;
}

.card-footer {
  padding: 16px 20px;
  border-top: 1px solid #F0F2F5;
  text-align: center;
}

.history-link {
  color: #0066CC;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.history-link:hover {
  color: #0052AA;
}
</style>