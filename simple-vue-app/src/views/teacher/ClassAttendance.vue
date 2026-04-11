<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { teacherApi, type TeacherAttendanceRecord } from '@/api/modules/teacher'

const today = new Date().toLocaleDateString('zh-CN')
const loading = ref(true)

const stats = ref({ present: 0, late: 0, absent: 0, leave: 0, total: 0 })
const records = ref<TeacherAttendanceRecord[]>([])
const classroom = ref('')

const statusText: Record<string, string> = { present: '出勤', late: '迟到', absent: '缺勤', leave: '请假' }

const fetchData = async () => {
  loading.value = true
  try {
    const res = await teacherApi.getClassAttendance()
    stats.value = res.data.stats
    records.value = res.data.records
    classroom.value = res.data.classroom
  } catch (err) {
    console.error('获取考勤数据失败', err)
    alert('获取考勤数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const refresh = () => fetchData()

const exportData = () => {
  alert('导出功能开发中...')
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
      <div>
        <h1 style="font-size: 24px">班级考勤</h1>
        <p style="color: #999">今日日期: {{ today }} | 班级: {{ classroom }}</p>
      </div>
      <div>
        <button class="btn btn-default" style="margin-right: 12px" @click="refresh">🔄 刷新</button>
        <button class="btn btn-primary" @click="exportData">📥 导出</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 60px">加载中...</div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card" style="border-top: 4px solid #52c41a">
          <div class="value">{{ stats.present }}</div>
          <div class="label">出勤 {{ stats.total ? ((stats.present / stats.total) * 100).toFixed(1) : 0 }}%</div>
        </div>
        <div class="stat-card" style="border-top: 4px solid #faad14">
          <div class="value" style="color: #faad14">{{ stats.late }}</div>
          <div class="label">迟到</div>
        </div>
        <div class="stat-card" style="border-top: 4px solid #ff4d4f">
          <div class="value" style="color: #ff4d4f">{{ stats.absent }}</div>
          <div class="label">缺勤</div>
        </div>
        <div class="stat-card" style="border-top: 4px solid #1890ff">
          <div class="value" style="color: #1890ff">{{ stats.leave }}</div>
          <div class="label">请假</div>
        </div>
      </div>

      <!-- 考勤记录 -->
      <div class="card">
        <div class="card-header">📋 今日考勤记录（共 {{ stats.total }} 人）</div>
        <table v-if="records.length > 0">
          <thead>
            <tr>
              <th>匿名ID</th>
              <th>姓名</th>
              <th>考勤状态</th>
              <th>考勤时间</th>
              <th>教室</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" :style="{ background: r.status === 'late' || r.status === 'absent' ? '#fffbe6' : 'white' }">
              <td><code style="background: #f5f5f5; padding: 2px 8px; border-radius: 4px">{{ r.anonymous_id }}</code></td>
              <td>{{ r.student_name || '-' }}</td>
              <td>
                <span :class="'tag tag-' + (r.status === 'present' ? 'green' : r.status === 'late' ? 'orange' : r.status === 'absent' ? 'red' : 'blue')">
                  {{ statusText[r.status] }}
                </span>
              </td>
              <td>{{ r.time?.slice(11, 19) || '-' }}</td>
              <td>{{ r.classroom_id }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else style="text-align: center; padding: 40px; color: #999">今日暂无考勤记录</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
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
  color: #333;
}
.label {
  color: #999;
  margin-top: 8px;
}
</style>