<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { teacherApi } from '@/api/modules/teacher'

const classId = ref('一年级1班')
const selectedMonth = ref(new Date().toISOString().slice(0, 7))
const loading = ref(false)

const stats = ref({
  present: 0,
  late: 0,
  absent: 0,
  leave: 0
})
const records = ref<any[]>([])

// 数据是否已成功加载（用于控制模板渲染）
const dataReady = ref(false)

const summary = computed(() => {
  const s = stats.value
  if (!s) {
    return { totalDays: 0, avgRate: 0, lateCount: 0, absentCount: 0 }
  }
  const total = (s.present || 0) + (s.late || 0) + (s.absent || 0) + (s.leave || 0)
  const avgRate = total > 0 ? (s.present / total) * 100 : 0
  return {
    totalDays: 1,
    avgRate,
    lateCount: s.late || 0,
    absentCount: s.absent || 0
  }
})

const fetchHistory = async () => {
  loading.value = true
  dataReady.value = false
  try {
    // 将月份（2026-04）转换为起始日期和结束日期
    const [year, month] = selectedMonth.value.split('-')
    const start = `${year}-${month}-01`
    // 获取当月最后一天
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const end = `${year}-${month}-${lastDay}`
    
    const res = await teacherApi.getHistory(start, end)
    if (res.success && res.data) {
      // 后端返回的是按日期聚合的统计数据，前端需要转换展示
      // 由于后端 /teacher/class/history 返回 summary 和 history 数组
      // 这里提取汇总信息
      const summaryData = res.data.summary || { totalDays: 0, avgRate: 0, lateCount: 0, absentCount: 0 }
      stats.value = {
        present: Math.round(summaryData.avgRate * (summaryData.totalDays || 1) / 100) || 0,
        late: summaryData.lateCount || 0,
        absent: summaryData.absentCount || 0,
        leave: 0
      }
      // 将 history 数组转换为记录明细（每个日期作为一条记录，展示该日期的统计）
      const historyList = res.data.history || []
      records.value = historyList.map((item: any) => ({
        id: item.date,
        anonymous_id: `班级汇总`,
        status: 'present',
        time: item.date,
        device_id: '',
        present: item.present,
        late: item.late,
        absent: item.absent,
        total: item.total
      }))
      dataReady.value = true
    } else {
      stats.value = { present: 0, late: 0, absent: 0, leave: 0 }
      records.value = []
      dataReady.value = true
    }
  } catch (err) {
    console.error('获取历史数据失败', err)
    alert('获取历史数据失败')
    stats.value = { present: 0, late: 0, absent: 0, leave: 0 }
    records.value = []
    dataReady.value = true
  } finally {
    loading.value = false
  }
}

const exportExcel = () => {
  alert('导出 Excel 功能开发中...')
}

onMounted(fetchHistory)
</script>

<template>
  <div>
    <h1 style="font-size: 24px; margin-bottom: 20px">历史统计</h1>

    <div class="card" style="margin-bottom: 20px">
      <div class="card-body" style="display: flex; gap: 16px; align-items: flex-end">
        <div class="form-group" style="margin-bottom: 0">
          <label>班级</label>
          <input type="text" v-model="classId" disabled style="width: 150px; background: #f5f5f5" />
        </div>
        <div class="form-group" style="margin-bottom: 0">
          <label>选择月份</label>
          <input type="month" v-model="selectedMonth" style="width: 150px" />
        </div>
        <button class="btn btn-primary" @click="fetchHistory" :disabled="loading">查询</button>
        <button class="btn btn-default" @click="exportExcel">📥 导出Excel</button>
      </div>
    </div>

    <div v-if="loading" style="text-align: center; padding: 60px">加载中...</div>

    <template v-else-if="dataReady">
      <div class="stats-grid" style="margin-bottom: 20px">
        <div class="stat-card">
          <div class="value">{{ summary.totalDays }}</div>
          <div class="label">统计天数</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #52c41a">{{ summary.avgRate.toFixed(1) }}%</div>
          <div class="label">出勤率</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #faad14">{{ summary.lateCount }}</div>
          <div class="label">迟到次数</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #ff4d4f">{{ summary.absentCount }}</div>
          <div class="label">缺勤次数</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">📋 每日考勤统计</div>
        <table v-if="records.length > 0">
          <thead>
            <tr>
              <th>日期</th>
              <th>出勤</th>
              <th>迟到</th>
              <th>缺勤</th>
              <th>总人数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td>{{ r.time || '--' }}</td>
              <td style="color: #52c41a">{{ r.present || 0 }}</td>
              <td style="color: #faad14">{{ r.late || 0 }}</td>
              <td style="color: #ff4d4f">{{ r.absent || 0 }}</td>
              <td>{{ r.total || 0 }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else style="text-align: center; padding: 40px; color: #999">所选月份无考勤记录</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}
.value {
  font-size: 32px;
  font-weight: bold;
}
.label {
  color: #999;
  margin-top: 8px;
}
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 20px;
}
.card-header {
  font-weight: bold;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.card-body {
  padding: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}
th {
  background: #fafafa;
  font-weight: 600;
  color: #333;
}
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}
.btn-primary {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}
.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}
.btn-default:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-group label {
  font-size: 12px;
  color: #666;
}
.form-group input {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}
</style>