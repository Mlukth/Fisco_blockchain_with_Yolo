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
    const res = await teacherApi.getHistory(classId.value, selectedMonth.value)
    if (res.success && res.data) {
      stats.value = res.data.stats || { present: 0, late: 0, absent: 0, leave: 0 }
      records.value = res.data.records || []
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
          <div class="label">统计月份</div>
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
        <div class="card-header">📋 考勤记录明细</div>
        <table v-if="records.length > 0">
          <thead>
            <tr>
              <th>日期</th>
              <th>学生ID（匿名）</th>
              <th>状态</th>
              <th>时间</th>
              <th>设备ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td>{{ r.time?.split('T')[0] || '--' }}</td>
              <td>{{ r.anonymous_id || '--' }}</td>
              <td>
                <span :class="'tag tag-' + (r.status === 'present' ? 'green' : r.status === 'late' ? 'orange' : r.status === 'absent' ? 'red' : 'blue')">
                  {{ r.status === 'present' ? '出勤' : r.status === 'late' ? '迟到' : r.status === 'absent' ? '缺勤' : '请假' }}
                </span>
              </td>
              <td>{{ r.time?.split('T')[1]?.slice(0, 5) || '--' }}</td>
              <td>{{ r.device_id || '--' }}</td>
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
.tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}
.tag-green {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}
.tag-orange {
  background: #fff7e6;
  color: #faad14;
  border: 1px solid #ffd591;
}
.tag-red {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}
.tag-blue {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
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