<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { mappingApi } from '@/api/modules/mapping'

const classId = ref('一年级1班')
const today = new Date().toISOString().split('T')[0]
const loading = ref(false)
const stats = ref({ present: 0, late: 0, absent: 0, leave: 0, total: 0 })
const records = ref<any[]>([])

const fetchData = async () => {
  loading.value = true
  try {
    const res = await mappingApi.getRecordsWithNames(classId.value, today)
    if (res.success) {
      records.value = res.data
      const s = { present: 0, late: 0, absent: 0, leave: 0 }
      res.data.forEach(r => {
        if (r.status === 'present') s.present++
        else if (r.status === 'late') s.late++
        else if (r.status === 'absent') s.absent++
        else if (r.status === 'leave') s.leave++
      })
      s.total = res.data.length
      stats.value = s
    }
  } catch (err) {
    console.error('获取班级考勤失败', err)
    alert('获取班级考勤失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <h1 style="font-size: 24px; margin-bottom: 20px">班级考勤 - {{ classId }}</h1>

    <div class="card" style="margin-bottom: 20px">
      <div class="card-body" style="display: flex; gap: 16px; align-items: flex-end">
        <div class="form-group">
          <label>日期</label>
          <input type="date" :value="today" disabled style="width: 150px; background: #f5f5f5" />
        </div>
        <button class="btn btn-primary" @click="fetchData" :disabled="loading">刷新</button>
      </div>
    </div>

    <div v-if="loading" style="text-align: center; padding: 60px">加载中...</div>

    <template v-else>
      <div class="stats-grid" style="margin-bottom: 20px">
        <div class="stat-card">
          <div class="value">{{ stats.total }}</div>
          <div class="label">总人数</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #52c41a">{{ stats.present }}</div>
          <div class="label">出勤</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #faad14">{{ stats.late }}</div>
          <div class="label">迟到</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color: #ff4d4f">{{ stats.absent }}</div>
          <div class="label">缺勤</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">📋 学生考勤明细</div>
        <table v-if="records.length > 0">
          <thead>
            <tr>
              <th>学生姓名</th>
              <th>匿名ID</th>
              <th>状态</th>
              <th>时间</th>
              <th>设备ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td><strong>{{ r.student_name || '--' }}</strong></td>
              <td>{{ r.anonymous_id }}</td>
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
        <p v-else style="text-align: center; padding: 40px; color: #999">今日暂无考勤记录</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.stat-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
.value { font-size: 32px; font-weight: bold; }
.label { color: #999; margin-top: 8px; }
.card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 20px; }
.card-header { font-weight: bold; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; font-weight: 600; }
.tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.tag-green { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.tag-orange { background: #fff7e6; color: #faad14; border: 1px solid #ffd591; }
.tag-red { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }
.tag-blue { background: #e6f7ff; color: #1890ff; border: 1px solid #91d5ff; }
.btn { padding: 8px 16px; border-radius: 4px; border: 1px solid #d9d9d9; background: white; cursor: pointer; font-size: 14px; }
.btn-primary { background: #1890ff; border-color: #1890ff; color: white; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group input { padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px; }
</style>