<template>
  <div class="history-page">
    <div class="page-header">
      <h1 class="page-title">历史统计</h1>
    </div>

    <div class="filter-bar">
      <div class="date-picker">
        <input v-model="start" type="date" class="date-input" />
        <span class="date-separator">至</span>
        <input v-model="end" type="date" class="date-input" />
      </div>
      <div class="date-shortcuts">
        <button class="shortcut-btn" @click="setLastWeek">上周</button>
        <button class="shortcut-btn" @click="setThisMonth">本月</button>
      </div>
      <button class="btn-query" @click="fetchData">查询</button>
    </div>

    <div class="summary-card">
      <div class="summary-item">
        <span class="summary-icon">📅</span>
        <div class="summary-content">
          <div class="summary-value">{{ data.summary.totalDays || 0 }}</div>
          <div class="summary-label">统计天数</div>
        </div>
      </div>
      <div class="summary-item">
        <span class="summary-icon">📈</span>
        <div class="summary-content">
          <div class="summary-value primary">{{ data.summary.avgRate || 0 }}%</div>
          <div class="summary-label">平均出勤率</div>
        </div>
      </div>
      <div class="summary-item">
        <span class="summary-icon">⏰</span>
        <div class="summary-content">
          <div class="summary-value warning">{{ data.summary.lateCount || 0 }}</div>
          <div class="summary-label">累计迟到</div>
        </div>
      </div>
      <div class="summary-item">
        <span class="summary-icon">❌</span>
        <div class="summary-content">
          <div class="summary-value danger">{{ data.summary.absentCount || 0 }}</div>
          <div class="summary-label">累计缺勤</div>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div ref="chartRef" class="chart-container"></div>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>出勤</th>
            <th>迟到</th>
            <th>缺勤</th>
            <th>请假</th>
            <th>出勤率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in data.history" :key="d.date">
            <td class="date">{{ d.date }}</td>
            <td>{{ d.present }}</td>
            <td class="late">{{ d.late }}</td>
            <td class="absent">{{ d.absent }}</td>
            <td>{{ d.leave }}</td>
            <td class="rate">{{ calcRate(d) }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { getClassHistory } from '@/api/teacher'
import * as echarts from 'echarts'

const start = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
const end = ref(new Date().toISOString().slice(0, 10))
const data = ref({ summary: {}, history: [] })
const chartRef = ref(null)
let chart = null

function calcRate(day) {
  const total = day.present + day.late + day.absent + day.leave
  return total > 0 ? ((day.present / total) * 100).toFixed(1) : '0.0'
}

function setLastWeek() {
  const now = new Date()
  const lastMonday = new Date(now.setDate(now.getDate() - now.getDay() - 6))
  const lastSunday = new Date(now.setDate(now.getDate() + 6))
  start.value = lastMonday.toISOString().slice(0, 10)
  end.value = lastSunday.toISOString().slice(0, 10)
  fetchData()
}

function setThisMonth() {
  const now = new Date()
  start.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  end.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  fetchData()
}

async function fetchData() {
  const res = await getClassHistory({ start: start.value, end: end.value })
  data.value = res.data
  await nextTick()
  renderChart()
}

function renderChart() {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const dates = data.value.history.map(d => d.date)
  const rates = data.value.history.map(d => parseFloat(calcRate(d)))
  chart.setOption({
    title: {
      text: '出勤率趋势',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 600, color: '#1D2129' }
    },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisLabel: { color: '#86909C' }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F0F2F5' } },
      axisLabel: { color: '#86909C' }
    },
    series: [{
      data: rates,
      type: 'line',
      smooth: true,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0, 102, 204, 0.3)' }, { offset: 1, color: 'rgba(0, 102, 204, 0.05)' }] } },
      lineStyle: { color: '#0066CC', width: 2 },
      itemStyle: { color: '#0066CC' }
    }]
  })
}

onMounted(fetchData)
watch([start, end], fetchData)
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
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.date-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid #E5E6EB;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
}

.date-separator {
  color: #86909C;
  font-size: 14px;
}

.date-shortcuts {
  display: flex;
  gap: 8px;
}

.shortcut-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #E5E6EB;
  border-radius: 20px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.shortcut-btn:hover {
  border-color: #0066CC;
  color: #0066CC;
}

.btn-query {
  margin-left: auto;
  padding: 8px 24px;
  background: #0066CC;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-query:hover {
  background: #0052AA;
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  background: #F5F7FA;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: #1D2129;
}

.summary-value.primary {
  color: #0066CC;
}

.summary-value.warning {
  color: #E6A23C;
}

.summary-value.danger {
  color: #F56C6C;
}

.summary-label {
  font-size: 14px;
  color: #86909C;
  margin-top: 2px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
}

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
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

.date {
  font-weight: 500;
  color: #1D2129;
}

.late {
  color: #E6A23C;
}

.absent {
  color: #F56C6C;
}

.rate {
  font-weight: 600;
  color: #67C23A;
}

@media (max-width: 1024px) {
  .summary-card {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .filter-bar {
    flex-wrap: wrap;
  }

  .summary-card {
    grid-template-columns: 1fr;
  }
}
</style>