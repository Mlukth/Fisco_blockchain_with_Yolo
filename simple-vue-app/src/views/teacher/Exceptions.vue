<template>
  <div class="exceptions-page">
    <div class="page-header">
      <h1 class="page-title">异常复核</h1>
    </div>

    <div class="hint-card">
      <span class="hint-icon">💡</span>
      <span class="hint-text">系统自动标记迟到/缺勤记录，点击可确认复核。</span>
    </div>

    <div v-if="exceptions.length === 0" class="empty-state">
      <span class="empty-icon">✅</span>
      <span class="empty-text">暂无待复核异常</span>
    </div>

    <div v-else class="exception-list">
      <div v-for="e in exceptions" :key="e.id" class="exception-card">
        <div class="exception-info">
          <div class="student-avatar">{{ e.student_name?.charAt(0) || '?' }}</div>
          <div class="student-details">
            <div class="student-name">{{ e.student_name }}</div>
            <div class="exception-meta">
              <span class="status-badge" :class="e.status">
                {{ statusText(e.status) }}
              </span>
              <span class="exception-time">{{ formatTime(e.time) }}</span>
            </div>
          </div>
        </div>
        <button class="btn-review" @click="review(e.id)">
          <span class="btn-icon">✓</span>
          标记已复核
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getExceptions, submitReview } from '@/api/teacher'

const exceptions = ref([])

function statusText(s) {
  return { late: '迟到', absent: '缺勤' }[s] || s
}

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN') : '-'
}

async function fetchData() {
  const res = await getExceptions()
  exceptions.value = res.data
}

async function review(id) {
  try {
    await submitReview({ recordId: id, isReviewed: true })
    fetchData()
  } catch (e) {
    alert('复核提交失败')
  }
}

onMounted(fetchData)
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

.hint-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #E6F4FF;
  padding: 14px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.hint-icon {
  font-size: 20px;
}

.hint-text {
  font-size: 14px;
  color: #0066CC;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  gap: 16px;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: 16px;
  color: #67C23A;
}

.exception-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exception-card {
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
  border-left: 4px solid #E6A23C;
}

.exception-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(4px);
}

.exception-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.student-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: 600;
}

.student-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.student-name {
  font-size: 16px;
  font-weight: 600;
  color: #1D2129;
}

.exception-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.late {
  background: #FFF7E6;
  color: #E6A23C;
}

.status-badge.absent {
  background: #FFF0F0;
  color: #F56C6C;
}

.exception-time {
  font-size: 13px;
  color: #86909C;
}

.btn-review {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 2px solid #67C23A;
  border-radius: 8px;
  color: #67C23A;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-review:hover {
  background: #67C23A;
  color: white;
}

.btn-icon {
  font-size: 16px;
}
</style>