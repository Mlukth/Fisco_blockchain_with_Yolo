<template>
  <div class="container">
    <h2>异常复核</h2>
    <div v-for="e in exceptions" :key="e.id" class="card">
      <span>{{ e.student_name }} - {{ e.status }} - {{ e.time }}</span>
      <button @click="review(e.id)">标记已复核</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getExceptions, submitReview } from '@/api/teacher'
const exceptions = ref([])
onMounted(async () => { exceptions.value = (await getExceptions()).data })
async function review(id) {
  await submitReview({ recordId: id, isReviewed: true })
  // 刷新列表
}
</script>