<template>
  <div class="container">
    <h2>历史统计</h2>
    <input type="date" v-model="start" /> ~ <input type="date" v-model="end" />
    <button @click="fetchData">查询</button>
    <div>平均出勤率: {{ data.summary?.avgRate }}%</div>
    <!-- 图表可后续用echarts -->
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getClassHistory } from '@/api/teacher'
const start = ref(''), end = ref(''), data = ref({})
async function fetchData() {
  data.value = (await getClassHistory({ start: start.value, end: end.value })).data
}
</script>