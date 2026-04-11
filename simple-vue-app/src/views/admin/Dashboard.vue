<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StatCard from '@/components/StatCard.vue'
import ActionCard from '@/components/ActionCard.vue'
import { adminApi, type AdminStats, type AdminDevice, type AdminException } from '@/api/modules/admin'

const router = useRouter()
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
const devices = ref<AdminDevice[]>([])
const alerts = ref<any[]>([])

const fetchData = async () => {
  loading.value = true
  try {
    const [statsRes, devicesRes, exceptionsRes] = await Promise.all([
      adminApi.getStats(),
      adminApi.getDevices(),
      adminApi.getExceptions()
    ])
    stats.value = statsRes.data
    devices.value = devicesRes.data
    // 处理异常提醒
    const attendanceAlerts = (exceptionsRes.data.attendance || []).map((a: any) => ({
      id: a.id,
      type: a.status === 'absent' ? 'error' : 'warning',
      content: `${a.student_name || a.anonymous_id} ${a.status === 'late' ? '迟到' : '缺勤'}`,
      time: a.time?.slice(11, 16) || '--:--',
      action: '复核'
    }))
    const deviceAlerts = (exceptionsRes.data.devices || []).map((d: any) => ({
      id: d.device_id,
      type: 'error',
      content: `${d.device_name} 设备${d.status === 'error' ? '异常' : '离线'}`,
      time: '',
      action: '查看'
    }))
    alerts.value = [...attendanceAlerts, ...deviceAlerts].slice(0, 5)
  } catch (err) {
    console.error('获取仪表盘数据失败', err)
  } finally {
    loading.value = false
  }
}

const navigate = (path: string) => router.push(path)

onMounted(fetchData)
</script>

<template>
  <div>
    <h1 style="font-size: 24px; margin-bottom: 8px">系统首页</h1>
    <p style="color: #999; margin-bottom: 20px">全校区考勤数据概览与设备状态监控</p>

    <!-- 加载状态 -->
    <div v-if="loading" style="display: flex; justify-content: center; padding: 60px">
      <span>加载中...</span>
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <StatCard title="学生总数" :value="stats.totalStudents" icon="👨‍🎓" color="#1890ff" />
        <StatCard title="教师总数" :value="stats.totalTeachers" icon="👨‍🏫" color="#52c41a" />
        <StatCard title="采集设备" :value="`${stats.onlineDevices}/${stats.totalDevices}`" icon="📱" color="#faad14" />
        <StatCard title="今日出勤率" :value="`${stats.todayAttendanceRate.toFixed(1)}%`" icon="📊" color="#722ed1" />
      </div>

      <!-- 设备监控 -->
      <div class="card" style="margin-bottom: 20px">
        <div class="card-header">📍 设备状态监控</div>
        <div class="card-body">
          <div style="display: flex; gap: 24px; margin-bottom: 16px">
            <div><span class="status-dot online"></span>在线 {{ stats.onlineDevices }}</div>
            <div><span class="status-dot offline"></span>离线 {{ devices.filter(d => d.status === 'offline').length }}</div>
            <div><span class="status-dot error"></span>异常 {{ devices.filter(d => d.status === 'error').length }}</div>
          </div>
          <table v-if="devices.length > 0">
            <tbody>
              <tr v-for="d in devices.slice(0, 5)" :key="d.device_id">
                <td>📷 {{ d.device_name }}</td>
                <td>{{ d.classroom_id }}</td>
                <td>
                  <span :class="'tag tag-' + (d.status === 'online' ? 'green' : d.status === 'error' ? 'red' : 'orange')">
                    {{ d.status === 'online' ? '在线' : d.status === 'error' ? '异常' : '离线' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else style="color: #999; text-align: center">暂无设备</p>
        </div>
      </div>

      <!-- 异常提醒 -->
      <div class="card">
        <div class="card-header">⚠️ 异常考勤提醒 <span style="float: right; color: #1890ff; cursor: pointer" @click="navigate('/teacher/review')">查看全部</span></div>
        <div class="card-body">
          <div v-if="alerts.length === 0" style="color: #999; text-align: center; padding: 20px">暂无异常</div>
          <div v-for="a in alerts" :key="a.id" style="display: flex; align-items: center; padding: 12px; background: a.type === 'error' ? '#fff2f0' : '#fffbe6'; border-radius: 8px; margin-bottom: 12px">
            <span style="margin-right: 12px">{{ a.type === 'error' ? '🚨' : '⚠️' }}</span>
            <span style="flex: 1">{{ a.content }}</span>
            <span style="color: #999; font-size: 13px; margin-right: 12px">{{ a.time }}</span>
            <button class="btn btn-primary" style="padding: 4px 12px" @click="navigate(a.type === 'error' && a.content.includes('设备') ? '/admin/devices' : '/teacher/review')">{{ a.action }}</button>
          </div>
        </div>
      </div>

      <!-- 操作卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        <ActionCard icon="☁️" title="考勤采集" description="上传考勤数据并生成默克尔根上链" @click="navigate('/upload')" color="#667eea" />
        <ActionCard icon="✅" title="考勤验真" description="验证默克尔根是否已存证" @click="navigate('/verify')" color="#52c41a" />
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
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>