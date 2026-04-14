<template>
  <div class="container">
    <h2>今日班级考勤</h2>
    <div>班级: {{ data.classroom }} 日期: {{ data.date }}</div>
    <div>出勤: {{ data.stats?.present }} 迟到: {{ data.stats?.late }} 缺勤: {{ data.stats?.absent }}</div>
    <table>
      <tr v-for="r in data.records" :key="r.id">
        <td>{{ r.student_name }}</td><td>{{ r.status }}</td><td>{{ r.time }}</td>
      </tr>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getClassAttendance } from '@/api/teacher'

const data = ref({ records: [], stats: {} })
onMounted(async () => { data.value = (await getClassAttendance()).data })
</script>