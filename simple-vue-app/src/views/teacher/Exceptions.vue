<template>
  <div class="container">
    <h2>异常复核</h2>
    <p class="hint">系统自动标记迟到/缺勤记录，点击可确认复核。</p>
    <div v-for="e in exceptions" :key="e.id" class="exception-card">
      <div class="info">
        <span class="student-name">{{ e.student_name }}</span>
        <span :class="['status-badge', e.status]">{{ statusText(e.status) }}</span>
        <span class="time">{{ formatTime(e.time) }}</span>
      </div>
      <button class="btn" @click="review(e.id)">✅ 标记已复核</button>
    </div>
    <p v-if="exceptions.length === 0" class="empty">暂无待复核异常</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getExceptions, submitReview } from '@/api/teacher'

const exceptions = ref([])

function statusText(s) {
  return { late: '迟到', absent: '缺勤' }[s] || s
}

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN') : '-'
}

async function fetchData() {
  const res = await getExceptions()
  exceptions.value = res.data
}

async function review(id) {
  try {
    await submitReview({ recordId: id, isReviewed: true })
    fetchData()
  } catch (e) {
    alert('复核提交失败')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.hint { color: #909399; margin-bottom: 20px; }
.exception-card { background: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
.info { display: flex; gap: 20px; align-items: center; }
.student-name { font-weight: bold; }
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; background: #fae6d1; color: #e6a23c; }
.status-badge.absent { background: #fbc4c4; color: #f56c6c; }
.time { color: #909399; }
.empty { text-align: center; padding: 40px; color: #909399; }
</style>