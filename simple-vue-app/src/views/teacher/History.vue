<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { teacherApi } from '@/api/modules/teacher'

const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  end: new Date().toISOString().slice(0, 10)
})
const loading = ref(false)
const summary = ref({ totalDays: 0, avgRate: 0, lateCount: 0, absentCount: 0 })
const history = ref<any[]>([])

const fetchHistory = async () => {
  loading.value = true
  try {
    const res = await teacherApi.getHistory(dateRange.value.start, dateRange.value.end)
    summary.value = res.data.summary
    history.value = res.data.history
  } catch (err) {
    console.error('获取历史数据失败', err)
    alert('获取历史数据失败')
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

    <!-- 筛选 -->
    <div class="card" style="margin-bottom: 20px">
      <div class="card-body" style="display: flex; gap: 16px; align-items: flex-end">
        <div class="form-group" style="margin-bottom: 0">
          <label>开始日期</label>
          <input type="date" v-model="dateRange.start" style="width: 150px" />
        </div>
        <div class="form-group" style="margin-bottom: 0">
          <label>结束日期</label>
          <input type="date" v-model="dateRange.end" style="width: 150px" />
        </div>
        <button class="btn btn-primary" @click="fetchHistory" :disabled="loading">查询</button>
        <button class="btn btn-default" @click="exportExcel">📥 导出Excel</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 60px">加载中...</div>

    <template v-else>
      <!-- 统计汇总 -->
      <div class="stats-grid" style="margin-bottom: 20px">
        <div class="stat-card">
          <div class="value">{{ summary.totalDays }}</div>
          <div class="label">总考勤天数</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #52c41a">{{ summary.avgRate.toFixed(1) }}%</div>
          <div class="label">平均出勤率</div>
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

      <!-- 历史记录 -->
      <div class="card">
        <div class="card-header">📋 历史记录</div>
        <table v-if="history.length > 0">
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
            <tr v-for="h in history" :key="h.date">
              <td><strong>{{ h.date }}</strong></td>
              <td>{{ h.present }}</td>
              <td>{{ h.late }}</td>
              <td>{{ h.absent }}</td>
              <td>{{ h.leave }}</td>
              <td>
                <span :class="'tag tag-' + (h.total ? (h.present / h.total >= 0.95 ? 'green' : h.present / h.total >= 0.9 ? 'orange' : 'red') : 'orange')">
                  {{ h.total ? ((h.present / h.total) * 100).toFixed(1) : '0.0' }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else style="text-align: center; padding: 40px; color: #999">所选日期范围内无考勤记录</p>
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
</style>