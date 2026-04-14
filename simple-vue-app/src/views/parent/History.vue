<template>
  <div class="container">
    <h2>历史考勤</h2>
    <select v-model="selectedChild">
      <option v-for="c in children" :value="c.anonymousId">{{ c.name }}</option>
    </select>
    <input type="month" v-model="month" />
    <button @click="fetchHistory">查询</button>
    <div v-if="history.summary">出勤:{{ history.summary.present }} 迟到:{{ history.summary.late }}</div>
    <div v-for="r in history.records" :key="r.id" class="record-item">
      <span>{{ r.time }} - {{ r.status }}</span>
      <span v-if="!r.verified" class="text-danger">⚠️ 存证异常</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAttendance, getHistory } from '@/api/parent'
const children = ref([]), selectedChild = ref(''), month = ref(''), history = ref({})
onMounted(async () => {
  const res = await getAttendance()
  children.value = res.data
  if (children.value.length) selectedChild.value = children.value[0].anonymousId
})
async function fetchHistory() {
  history.value = (await getHistory({ anonymousId: selectedChild.value, month: month.value })).data
}
</script>