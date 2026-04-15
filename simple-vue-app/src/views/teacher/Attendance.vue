<template>
  <div class="attendance-page">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">今日班级考勤</h1>
        <span class="page-subtitle">{{ data.classroom }} · {{ data.date }}</span>
      </div>
      <div class="header-right">
        <span class="attendance-rate">
          出勤率：<strong>{{ attendanceRate }}%</strong>
        </span>
      </div>
    </div>

    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-icon present">📊</div>
        <div class="summary-content">
          <div class="summary-value">{{ summary?.today?.present || 0 }}/{{ summary?.today?.total || 0 }}</div>
          <div class="summary-label">今日出勤</div>
        </div>
        <div class="summary-rate success">{{ summary?.today?.rate || 0 }}%</div>
      </div>

      <div class="summary-card alert" @click="$router.push('/teacher/exceptions')">
        <div class="summary-icon warning">⚠️</div>
        <div class="summary-content">
          <div class="summary-value">{{ summary?.pendingExceptions || 0 }}</div>
          <div class="summary-label">待处理异常</div>
        </div>
        <div class="summary-rate warning">条</div>
      </div>

      <div class="summary-card">
        <div class="summary-icon info">📈</div>
        <div class="summary-content">
          <div class="summary-value">{{ summary?.lastWeekRate || 0 }}%</div>
          <div class="summary-label">上周平均出勤率</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card present">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ data.stats?.present || 0 }}</div>
        <div class="stat-label">出勤</div>
      </div>
      <div class="stat-card late">
        <div class="stat-icon">⏰</div>
        <div class="stat-value">{{ data.stats?.late || 0 }}</div>
        <div class="stat-label">迟到</div>
      </div>
      <div class="stat-card absent">
        <div class="stat-icon">❌</div>
        <div class="stat-value">{{ data.stats?.absent || 0 }}</div>
        <div class="stat-label">缺勤</div>
      </div>
      <div class="stat-card leave">
        <div class="stat-icon">📝</div>
        <div class="stat-value">{{ data.stats?.leave || 0 }}</div>
        <div class="stat-label">请假</div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <h3>考勤明细</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>学生姓名</th>
            <th>状态</th>
            <th>打卡时间</th>
            <th>存证状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in data.records" :key="r.id">
            <td class="student-name">{{ r.student_name }}</td>
            <td>
              <span class="status-badge" :class="r.status">
                {{ statusText(r.status) }}
              </span>
            </td>
            <td class="time">{{ formatTime(r.time) }}</td>
            <td>
              <!-- 区块链存证状态 -->
              <span v-if="r.merkle_root" class="chain-badge verified" title="该记录已上链存证">
                🔒 已存证
              </span>
              <span v-else class="chain-badge pending" title="尚未进行链上存证">
                ⏳ 待存证
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { getClassAttendance } from '@/api/teacher'
import request from '@/api/request'

const data = ref({ records: [], stats: {}, classroom: '', date: '' })
const summary = ref(null)
const showMessage = inject('showMessage')

const attendanceRate = computed(() => {
  const s = data.value.stats
  const total = (s.present || 0) + (s.late || 0) + (s.absent || 0) + (s.leave || 0)
  return total > 0 ? ((s.present / total) * 100).toFixed(1) : '0.0'
})

function statusText(status) {
  const map = { present: '出勤', late: '迟到', absent: '缺勤', leave: '请假' }
  return map[status] || status
}

function formatTime(time) {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function fetchSummary() {
  try {
    const res = await request.get('/teacher/dashboard-summary')
    summary.value = res.data
  } catch (e) {
    console.error('获取摘要失败', e)
  }
}

onMounted(async () => {
  const res = await getClassAttendance()
  data.value = res.data
  await fetchSummary()
  if (parseFloat(attendanceRate.value) < 80) {
    showMessage('今日出勤率较低，请关注学生状态', 'warning')
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #86909C;
}

.header-right {
  display: flex;
  align-items: center;
}

.attendance-rate {
  font-size: 14px;
  color: #606266;
  background: #F5F7FA;
  padding: 8px 16px;
  border-radius: 8px;
}

.attendance-rate strong {
  color: #67C23A;
  font-size: 16px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.summary-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.summary-card.alert {
  cursor: pointer;
  border-left: 4px solid #E6A23C;
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
  background: #E1F3D8;
}

.summary-icon.warning {
  background: #FFF7E6;
}

.summary-icon.info {
  background: #E6F4FF;
}

.summary-content {
  flex: 1;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: #1D2129;
  line-height: 1.2;
}

.summary-label {
  font-size: 14px;
  color: #86909C;
  margin-top: 2px;
}

.summary-rate {
  font-size: 20px;
  font-weight: 600;
  color: #67C23A;
}

.summary-rate.warning {
  color: #E6A23C;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.present {
  background: #F0F9EB;
}

.stat-card.late {
  background: #FFF7E6;
}

.stat-card.absent {
  background: #FFF0F0;
}

.stat-card.leave {
  background: #F4F4F5;
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-card.present .stat-value {
  color: #67C23A;
}

.stat-card.late .stat-value {
  color: #E6A23C;
}

.stat-card.absent .stat-value {
  color: #F56C6C;
}

.stat-card.leave .stat-value {
  color: #909399;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-top: 4px;
}

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.table-header {
  padding: 16px 20px;
  border-bottom: 1px solid #F0F2F5;
}

.table-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1D2129;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 20px;
  text-align: left;
  border-bottom: 1px solid #F0F2F5;
}

.data-table th {
  background: #F5F7FA;
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.data-table tbody tr:hover {
  background: #EEF7FF;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.student-name {
  font-weight: 500;
  color: #1D2129;
}

.time {
  color: #86909C;
  font-size: 13px;
}

.status-badge {
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

/* 区块链存证标签样式 */
.chain-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
.chain-badge.verified {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}
.chain-badge.pending {
  background: #f5f5f5;
  color: #757575;
  border: 1px solid #e0e0e0;
}

@media (max-width: 1024px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>