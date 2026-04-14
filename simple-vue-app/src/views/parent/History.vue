<template>
  <div class="history-page">
    <div class="page-header">
      <h1 class="page-title">历史考勤</h1>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <label>选择孩子</label>
        <select v-model="selectedChild" @change="fetchHistory" class="filter-select">
          <option value="">请选择</option>
          <option v-for="c in children" :key="c.anonymousId" :value="c.anonymousId">
            {{ c.name }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>选择月份</label>
        <input v-model="month" type="month" @change="fetchHistory" class="filter-input" />
      </div>
    </div>

    <div class="summary-card">
      <div class="summary-item">
        <div class="summary-icon present">✅</div>
        <div class="summary-content">
          <div class="summary-value">{{ history.summary?.present || 0 }}</div>
          <div class="summary-label">出勤天数</div>
        </div>
      </div>
      <div class="summary-item">
        <div class="summary-icon warning">⏰</div>
        <div class="summary-content">
          <div class="summary-value">{{ history.summary?.late || 0 }}</div>
          <div class="summary-label">迟到次数</div>
        </div>
      </div>
    </div>

    <div class="record-list">
      <div v-if="history.records?.length === 0" class="empty-state">
        <span class="empty-icon">📅</span>
        <span class="empty-text">暂无考勤记录</span>
      </div>

      <div v-else class="record-cards">
        <div v-for="r in history.records" :key="r.time" class="record-card">
          <div class="record-time">
            <span class="time-icon">🕐</span>
            <span class="time-text">{{ r.time }}</span>
          </div>
          <div class="record-status">
            <span class="status-badge" :class="r.status">
              {{ statusText(r.status) }}
            </span>
            <span v-if="r.verifyFailed" class="verify-warning">
              ⚠️ 存证异常
            </span>
          </div>
          <button class="btn-feedback" @click="showFeedbackHint">
            💬 反馈异常
          </button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showHint" class="feedback-hint">
        🚧 反馈功能开发中，敬请期待
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAttendance, getHistory } from '@/api/parent'

const children = ref([])
const selectedChild = ref('')
const month = ref(new Date().toISOString().slice(0, 7))
const history = ref({ records: [], summary: {} })
const showHint = ref(false)

onMounted(async () => {
  const res = await getAttendance()
  children.value = res.data
  if (children.value.length) {
    selectedChild.value = children.value[0].anonymousId
    fetchHistory()
  }
})

async function fetchHistory() {
  if (!selectedChild.value) return
  const res = await getHistory({
    anonymousId: selectedChild.value,
    month: month.value
  })
  history.value = res.data
}

function statusText(s) {
  return { present: '出勤', late: '迟到', absent: '缺勤', leave: '请假' }[s] || s
}

function showFeedbackHint() {
  showHint.value = true
  setTimeout(() => showHint.value = false, 2000)
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

.filter-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.filter-select,
.filter-input {
  padding: 10px 14px;
  border: 1px solid #E5E6EB;
  border-radius: 8px;
  font-size: 14px;
  color: #1D2129;
  min-width: 180px;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.summary-card {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.summary-icon.present {
  background: #F0F9EB;
}

.summary-icon.warning {
  background: #FFF7E6;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: #1D2129;
}

.summary-label {
  font-size: 14px;
  color: #86909C;
  margin-top: 2px;
}

.record-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
}

.empty-icon {
  font-size: 48px;
}

.empty-text {
  font-size: 16px;
  color: #86909C;
}

.record-cards {
  padding: 0;
}

.record-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 24px;
  border-bottom: 1px solid #F0F2F5;
  transition: all 0.2s;
}

.record-card:last-child {
  border-bottom: none;
}

.record-card:hover {
  background: #EEF7FF;
}

.record-time {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}

.time-icon {
  font-size: 16px;
}

.time-text {
  font-size: 14px;
  color: #606266;
}

.record-status {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  display: inline-block;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.present {
  background: #E1F3D8;
  color: #67C23A;
}

.status-badge.late {
  background: #FFF7E6;
  color: #E6A23C;
}

.status-badge.absent {
  background: #FFF0F0;
  color: #F56C6C;
}

.status-badge.leave {
  background: #F4F4F5;
  color: #909399;
}

.verify-warning {
  display: inline-block;
  padding: 4px 10px;
  background: #FFF2F0;
  color: #F56C6C;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.btn-feedback {
  padding: 6px 14px;
  background: white;
  border: 1px solid #E5E6EB;
  border-radius: 16px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-feedback:hover {
  border-color: #0066CC;
  color: #0066CC;
  background: #EEF7FF;
}

.feedback-hint {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #F4F4F5;
  color: #909399;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
  }

  .summary-card {
    flex-direction: column;
  }

  .record-card {
    flex-wrap: wrap;
  }
}
</style>