<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type AdminStats } from '@/api/modules/admin'

const loading = ref(true)
const stats = ref<AdminStats>({
  totalStudents: 0,
  totalTeachers: 0,
  totalParents: 0,
  totalDevices: 0,
  onlineDevices: 0,
  todayAttendanceRate: 0,
  todayTotal: 0
})
const exceptions = ref<{ attendance: any[]; devices: any[] }>({ attendance: [], devices: [] })

const fetchData = async () => {
  loading.value = true
  try {
    const [statsRes, exceptionsRes] = await Promise.all([
      adminApi.getStats(),
      adminApi.getExceptions()
    ])

    if (statsRes.success) {
      // 后端未提供设备统计，设置为 0
      stats.value = {
        totalStudents: statsRes.data.totalStudents || 0,
        totalTeachers: statsRes.data.totalTeachers || 0,
        totalParents: statsRes.data.totalParents || 0,
        totalDevices: 0,
        onlineDevices: 0,
        todayAttendanceRate: statsRes.data.todayAttendanceRate || 0,
        todayTotal: statsRes.data.todayTotal || 0
      }
    }

    if (exceptionsRes.success) {
      exceptions.value = exceptionsRes.data
    }
  } catch (error) {
    console.error('获取仪表盘数据失败', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="dashboard">
    <h1 class="page-title">仪表盘</h1>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalStudents }}</div>
          <div class="stat-label">学生总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalTeachers }}</div>
          <div class="stat-label">教师数量</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalParents }}</div>
          <div class="stat-label">家长数量</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-value">{{ stats.todayAttendanceRate.toFixed(1) }}%</div>
          <div class="stat-label">今日出勤率</div>
        </div>
      </div>

      <!-- 异常考勤提醒 -->
      <div class="card">
        <div class="card-header">⚠️ 异常考勤提醒</div>
        <table v-if="exceptions.attendance.length > 0">
          <thead>
            <tr>
              <th>时间</th>
              <th>匿名ID</th>
              <th>状态</th>
              <th>班级</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in exceptions.attendance" :key="item.id">
              <td>{{ item.time?.split('T')[0] }} {{ item.time?.split('T')[1]?.slice(0,5) }}</td>
              <td>{{ item.anonymous_id }}</td>
              <td>
                <span :class="['status-tag', item.status === 'absent' ? 'status-absent' : 'status-late']">
                  {{ item.status === 'absent' ? '缺勤' : '迟到' }}
                </span>
              </td>
              <td>{{ item.classroom_id }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-text">暂无异常考勤记录</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}
.page-title {
  font-size: 24px;
  margin-bottom: 24px;
}
.loading {
  text-align: center;
  padding: 60px;
  color: #666;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}
.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  text-align: center;
  transition: transform 0.2s;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #1a1a1a;
}
.stat-label {
  margin-top: 8px;
  color: #888;
  font-size: 14px;
}
.highlight .stat-value {
  color: #52c41a;
}
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 20px;
}
.card-header {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
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
.status-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.status-absent {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}
.status-late {
  background: #fff7e6;
  color: #faad14;
  border: 1px solid #ffd591;
}
.empty-text {
  text-align: center;
  padding: 30px;
  color: #999;
}
</style>