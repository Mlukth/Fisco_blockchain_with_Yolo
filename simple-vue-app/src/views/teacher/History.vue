<template>
  <div class="container">
    <h2>历史统计</h2>
    <div class="filter-bar">
      <div class="date-shortcuts">
        <button class="btn" @click="setLastWeek">上周</button>
        <button class="btn" @click="setThisMonth">本月</button>
      </div>
      <input type="date" v-model="start" /> ~ <input type="date" v-model="end" />
      <button class="btn btn-primary" @click="fetchData">查询</button>
    </div>
    <div v-if="data.summary" class="summary-card">
      <div>统计天数：{{ data.summary.totalDays }} 天</div>
      <div>平均出勤率：{{ data.summary.avgRate }}%</div>
      <div>累计迟到：{{ data.summary.lateCount }} 次</div>
      <div>累计缺勤：{{ data.summary.absentCount }} 次</div>
    </div>
    <div ref="chartRef" class="chart-container"></div>
    <table class="data-table">
      <thead>
        <tr><th>日期</th><th>出勤</th><th>迟到</th><th>缺勤</th><th>请假</th><th>出勤率</th></tr>
      </thead>
      <tbody>
        <tr v-for="d in data.history" :key="d.date">
          <td>{{ d.date }}</td>
          <td>{{ d.present }}</td>
          <td>{{ d.late }}</td>
          <td>{{ d.absent }}</td>
          <td>{{ d.leave }}</td>
          <td>{{ calcRate(d) }}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { getClassHistory } from '@/api/teacher'
import * as echarts from 'echarts'

const start = ref(new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10))
const end = ref(new Date().toISOString().slice(0,10))
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
  start.value = lastMonday.toISOString().slice(0,10)
  end.value = lastSunday.toISOString().slice(0,10)
  fetchData()
}

function setThisMonth() {
  const now = new Date()
  start.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
  end.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10)
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
    title: { text: '出勤率趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [{ data: rates, type: 'line', smooth: true, areaStyle: { color: '#409eff20' } }]
  })
}

onMounted(fetchData)
watch([start, end], fetchData)
</script>

<style scoped>
.filter-bar { display: flex; gap: 15px; align-items: center; margin-bottom: 20px; }
.date-shortcuts { display: flex; gap: 8px; }
.summary-card { display: flex; gap: 30px; background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
.chart-container { height: 300px; margin-bottom: 30px; background: white; border-radius: 8px; padding: 20px; }
.data-table { width: 100%; background: white; border-radius: 8px; }
.data-table th, .data-table td { padding: 12px; border-bottom: 1px solid #ebeef5; }
</style>