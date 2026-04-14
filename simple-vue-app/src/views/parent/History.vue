<template>
  <div class="container">
    <h2>历史考勤</h2>
    <select v-model="selectedChild" @change="fetchHistory">
      <option v-for="c in children" :value="c.anonymousId" :key="c.anonymousId">{{ c.name }}</option>
    </select>
    <input type="month" v-model="month" @change="fetchHistory" />
    <div v-if="history.summary">出勤:{{ history.summary.present }} 迟到:{{ history.summary.late }}</div>
    <div v-for="r in history.records" :key="r.id" class="record-item">
      <span>{{ r.time }} - {{ statusText(r.status) }}</span>
      <span v-if="!r.verified" class="text-danger">⚠️ 存证异常</span>
      <button class="feedback-btn" @click="showFeedbackHint">💬 反馈异常</button>
    </div>
    <div v-if="showHint" class="dev-hint">🚧 反馈功能开发中，敬请期待</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAttendance, getHistory } from '@/api/parent'

const children = ref([])
const selectedChild = ref('')
const month = ref(new Date().toISOString().slice(0,7))
const history = ref({ records: [], summary: {} })
const showHint = ref(false)

onMounted(async () => {
  const res = await getAttendance()
  children.value = res.data
  if (children.value.length) {
    selectedChild.value = children.value[0].anonymousId
    fetchHistory()
  }
})

async function fetchHistory() {
  if (!selectedChild.value) return
  const res = await getHistory({ anonymousId: selectedChild.value, month: month.value })
  history.value = res.data
}

function statusText(s) {
  return { present:'出勤', late:'迟到', absent:'缺勤', leave:'请假' }[s] || s
}

function showFeedbackHint() {
  showHint.value = true
  setTimeout(() => showHint.value = false, 2000)
}
</script>

<style scoped>
.record-item { display: flex; gap: 20px; padding: 12px; border-bottom: 1px solid #eee; align-items: center; }
.feedback-btn { margin-left: auto; background: none; border: 1px solid #dcdfe6; padding: 4px 12px; border-radius: 16px; cursor: pointer; }
.dev-hint { background: #f4f4f5; padding: 8px 16px; border-radius: 20px; color: #909399; text-align: center; margin-top: 10px; }
</style>