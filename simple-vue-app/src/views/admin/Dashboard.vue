<template>
  <div class="container">
    <h1>仪表盘</h1>
    <div v-if="warning" class="alert-banner">
      ⚠️ 系统检测到部分考勤数据与存证记录不一致，请关注数据完整性。
    </div>
    
    <!-- 告警聚合卡片（新增） -->
    <div class="alert-cards" v-if="alertSummary">
      <div class="alert-card" v-if="alertSummary.attendanceAlerts > 0" @click="$router.push('/admin/exceptions')">
        <span class="icon">⚠️</span>
        <span>考勤异常：{{ alertSummary.attendanceAlerts }} 条</span>
      </div>
      <div class="alert-card" v-if="alertSummary.deviceAlerts > 0" @click="$router.push('/admin/devices')">
        <span class="icon">📡</span>
        <span>离线设备：{{ alertSummary.deviceAlerts }} 台</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="card">学生总数: {{ stats.totalStudents }}</div>
      <div class="card">教师数: {{ stats.totalTeachers }}</div>
      <div class="card">家长数: {{ stats.totalParents }}</div>
      <div class="card">今日出勤率: {{ stats.todayAttendanceRate }}%</div>
    </div>
    
    <div class="card">
      <h3>高级维护</h3>
      <button @click="runVerify" class="btn btn-warning">强制验证存证一致性</button>
      <span v-if="verifyMsg">{{ verifyMsg }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { getStats, verifyAll } from '@/api/admin'
import request from '@/api/request'

const stats = ref({})
const warning = ref(false)
const verifyMsg = ref('')
const alertSummary = ref(null)
const showMessage = inject('showMessage')

onMounted(async () => {
  await fetchStats()
  await fetchAlertSummary()
})

async function fetchStats() {
  const res = await getStats()
  stats.value = res.data
  warning.value = res.data.dataConsistencyWarning || false
}

async function fetchAlertSummary() {
  try {
    const res = await request.get('/admin/alert-summary')
    alertSummary.value = res.data
  } catch (e) {}
}

async function runVerify() {
  verifyMsg.value = '验证中...'
  try {
    const res = await verifyAll()
    verifyMsg.value = `验证完成：检查 ${res.data.totalRecords} 条记录，异常批次 ${res.data.mismatchBatches}`
    showMessage('数据完整性检测完成', res.data.mismatchBatches ? 'warning' : 'success')
    fetchStats()
  } catch (e) {
    verifyMsg.value = '验证失败'
    showMessage('验证失败，请稍后重试', 'error')
  }
}
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
.alert-banner { background: #fdf6ec; border-left: 4px solid #e6a23c; padding: 12px 20px; margin-bottom: 20px; border-radius: 8px; }
.alert-cards { display: flex; gap: 15px; margin-bottom: 20px; }
.alert-card { background: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; cursor: pointer; border-left: 4px solid #e6a23c; }
.alert-card .icon { font-size: 20px; }
</style>