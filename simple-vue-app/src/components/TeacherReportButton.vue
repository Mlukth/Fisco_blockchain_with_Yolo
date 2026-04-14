<template>
  <div class="report-action">
    <button class="btn btn-primary" @click="generateReport" :disabled="loading">
      {{ loading ? '生成中...' : '📋 生成本日报告' }}
    </button>
    <div v-if="showReport" class="modal-overlay" @click.self="closeReport">
      <div class="report-modal">
        <h3>📊 {{ reportData.classroom }} 考勤报告</h3>
        <p class="date">{{ reportData.date }}</p>
        <div class="stats">
          <div class="stat">✅ 出勤 <span>{{ reportData.stats?.present || 0 }}</span></div>
          <div class="stat">⏰ 迟到 <span>{{ reportData.stats?.late || 0 }}</span></div>
          <div class="stat">❌ 缺勤 <span>{{ reportData.stats?.absent || 0 }}</span></div>
          <div class="stat">📝 请假 <span>{{ reportData.stats?.leave || 0 }}</span></div>
        </div>
        <div class="summary">应到 {{ total }} 人，实到 {{ reportData.stats?.present || 0 }} 人，出勤率 {{ rate }}%</div>
        <div class="actions">
          <button class="btn" @click="copyReport">📋 复制内容</button>
          <button class="btn" @click="closeReport">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getClassAttendance } from '@/api/teacher'

const loading = ref(false)
const showReport = ref(false)
const reportData = ref({ classroom: '', date: '', stats: {} })

const total = computed(() => {
  const s = reportData.value.stats
  return (s.present || 0) + (s.late || 0) + (s.absent || 0) + (s.leave || 0)
})
const rate = computed(() => total.value > 0 ? ((reportData.value.stats.present / total.value) * 100).toFixed(1) : '0.0')

async function generateReport() {
  loading.value = true
  try {
    const res = await getClassAttendance()
    reportData.value = { classroom: res.data.classroom, date: res.data.date, stats: res.data.stats }
    showReport.value = true
  } catch { alert('获取失败') } finally { loading.value = false }
}

function copyReport() {
  const text = `【${reportData.value.classroom} 考勤报告】\n日期：${reportData.value.date}\n出勤：${reportData.value.stats.present}人 迟到：${reportData.value.stats.late}人 缺勤：${reportData.value.stats.absent}人 请假：${reportData.value.stats.leave}人\n出勤率：${rate.value}%`
  navigator.clipboard?.writeText(text).then(() => alert('已复制')).catch(() => alert('复制失败'))
}

function closeReport() { showReport.value = false }
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.report-modal { background: white; border-radius: 16px; padding: 30px; width: 400px; text-align: center; }
.date { color: #909399; margin-bottom: 20px; }
.stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
.stat { background: #f5f7fa; padding: 10px; border-radius: 8px; }
.stat span { display: block; font-size: 24px; font-weight: bold; }
.summary { background: #ecf5ff; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
.actions { display: flex; gap: 10px; justify-content: center; }
</style>