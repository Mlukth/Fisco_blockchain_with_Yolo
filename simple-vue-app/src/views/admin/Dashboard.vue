<template>
  <div class="container">
    <h1>仪表盘</h1>
    <div v-if="warning" class="alert-banner">
      ⚠️ 系统检测到部分考勤数据与存证记录不一致，请关注数据完整性。
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
import { ref, onMounted } from 'vue'
import { getStats, verifyAll } from '@/api/admin'

const stats = ref({})
const warning = ref(false)
const verifyMsg = ref('')

onMounted(async () => {
  const res = await getStats()
  stats.value = res.data
  warning.value = res.data.dataConsistencyWarning || false
})

async function runVerify() {
  verifyMsg.value = '验证中...'
  try {
    const res = await verifyAll()
    verifyMsg.value = `验证完成：检查 ${res.data.totalRecords} 条记录，异常批次 ${res.data.mismatchBatches}`
    // 刷新统计以更新告警状态
    const newStats = await getStats()
    warning.value = newStats.data.dataConsistencyWarning || false
  } catch (e) {
    verifyMsg.value = '验证失败'
  }
}
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; }
</style>