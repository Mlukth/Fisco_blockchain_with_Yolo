<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { mappingApi } from '@/api/modules/mapping'

const children = ref<any[]>([])
const todayRecords = ref<any[]>([])
const loading = ref(false)

const fetchChildren = async () => {
  try {
    const res = await mappingApi.getChildren()
    if (res.success) children.value = res.data
  } catch (err) {
    console.error('获取孩子列表失败', err)
  }
}

const fetchTodayAttendance = async () => {
  if (children.value.length === 0) return
  loading.value = true
  try {
    const ids = children.value.map(c => c.anonymous_id)
    const res = await mappingApi.getRecordsWithNames(undefined, new Date().toISOString().split('T')[0])
    if (res.success) {
      todayRecords.value = res.data.filter(r => ids.includes(r.anonymous_id))
    }
  } catch (err) {
    console.error('获取今日考勤失败', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchChildren()
  await fetchTodayAttendance()
})
</script>

<template>
  <div>
    <h1 style="font-size: 24px; margin-bottom: 20px">孩子考勤</h1>

    <div v-if="children.length === 0" class="card">
      <p>您尚未绑定任何孩子，请联系管理员绑定。</p>
    </div>

    <template v-else>
      <div class="card" style="margin-bottom: 20px">
        <div class="card-header">👶 我的孩子</div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap">
          <span v-for="c in children" :key="c.anonymous_id" class="child-tag">
            {{ c.student_name }} ({{ c.anonymous_id }})
          </span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">📅 今日考勤状态</div>
        <div v-if="loading">加载中...</div>
        <table v-else-if="todayRecords.length > 0">
          <thead>
            <tr>
              <th>孩子姓名</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in todayRecords" :key="r.id">
              <td>{{ r.student_name }}</td>
              <td>
                <span :class="'tag tag-' + (r.status === 'present' ? 'green' : 'orange')">
                  {{ r.status === 'present' ? '已到校' : '已离校' }}
                </span>
              </td>
              <td>{{ r.time?.split('T')[1]?.slice(0, 5) || '--' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>今日暂无考勤记录</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.child-tag {
  background: #f0f0f0;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
}
</style>