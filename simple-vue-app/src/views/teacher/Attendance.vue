<template>
  <div class="container">
    <div class="page-header">
      <h2>今日班级考勤</h2>
      <TeacherReportButton />
    </div>
    
    <!-- 首页摘要卡片（新增） -->
    <div class="summary-cards" v-if="summary">
      <div class="summary-card">
        <div class="label">今日出勤</div>
        <div class="value">{{ summary.today.present }}/{{ summary.today.total }}</div>
        <div class="rate">{{ summary.today.rate }}%</div>
      </div>
      <div class="summary-card">
        <div class="label">待处理异常</div>
        <div class="value" :class="{ alert: summary.pendingExceptions > 0 }">{{ summary.pendingExceptions }}</div>
        <div class="sub">条</div>
      </div>
      <div class="summary-card">
        <div class="label">上周平均出勤率</div>
        <div class="value">{{ summary.lastWeekRate }}%</div>
      </div>
    </div>

    <div class="card">
      <div class="stats-row">
        <div class="stat-item">班级：{{ data.classroom }}</div>
        <div class="stat-item">日期：{{ data.date }}</div>
        <div class="stat-item">出勤率：{{ attendanceRate }}%</div>
      </div>
      <div class="stats-grid">
        <div class="stat-card present">✅ 出勤 {{ data.stats?.present || 0 }}</div>
        <div class="stat-card late">⏰ 迟到 {{ data.stats?.late || 0 }}</div>
        <div class="stat-card absent">❌ 缺勤 {{ data.stats?.absent || 0 }}</div>
        <div class="stat-card leave">📝 请假 {{ data.stats?.leave || 0 }}</div>
      </div>
    </div>
    <table class="data-table">
      <thead>
        <tr><th>学生姓名</th><th>状态</th><th>打卡时间</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in data.records" :key="r.id">
          <td>{{ r.student_name }}</td>
          <td><span :class="['status-badge', r.status]">{{ statusText(r.status) }}</span></td>
          <td>{{ formatTime(r.time) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { getClassAttendance } from '@/api/teacher'
import request from '@/api/request'
import TeacherReportButton from '@/components/TeacherReportButton.vue'

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
  return time ? new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-'
}

async function fetchSummary() {
  try {
    const res = await request.get('/teacher/dashboard-summary')
    summary.value = res.data
  } catch (e) {}
}

onMounted(async () => {
  const res = await getClassAttendance()
  data.value = res.data
  await fetchSummary()
  // 情感化反馈：今日出勤率低于80%时提示
  if (attendanceRate.value < 80) {
    showMessage('今日出勤率较低，请关注学生状态', 'warning')
  }
})
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.summary-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-bottom: 20px; }
.summary-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; }
.summary-card .label { color: #909399; margin-bottom: 8px; }
.summary-card .value { font-size: 32px; font-weight: bold; color: #303133; }
.summary-card .value.alert { color: #e6a23c; }
.summary-card .rate { color: #67c23a; }
.summary-card .sub { color: #909399; }
.stats-row { display: flex; gap: 30px; margin-bottom: 20px; color: #606266; }
.stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-bottom: 30px; }
.stat-card { padding: 16px; border-radius: 8px; text-align: center; font-weight: bold; }
.stat-card.present { background: #f0f9eb; color: #67c23a; }
.stat-card.late { background: #fdf6ec; color: #e6a23c; }
.stat-card.absent { background: #fef0f0; color: #f56c6c; }
.stat-card.leave { background: #f4f4f5; color: #909399; }
.data-table { width: 100%; background: white; border-radius: 8px; overflow: hidden; }
.data-table th, .data-table td { padding: 14px; border-bottom: 1px solid #ebeef5; }
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; background: #ecf5ff; }
.status-badge.present { background: #e1f3d8; color: #67c23a; }
.status-badge.late { background: #fae6d1; color: #e6a23c; }
.status-badge.absent { background: #fbc4c4; color: #f56c6c; }
</style>