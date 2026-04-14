<template>
  <div class="container">
    <h2>孩子今日考勤</h2>
    <div v-for="c in children" :key="c.anonymousId" class="card">
      <span>{{ c.name }} ({{ c.class }}) : {{ c.attendance?.status || '未知' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAttendance } from '@/api/parent'
const children = ref([])
onMounted(async () => { children.value = (await getAttendance()).data })
</script>