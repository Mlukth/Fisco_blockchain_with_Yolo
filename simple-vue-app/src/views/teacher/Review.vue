<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { teacherApi, type TeacherAttendanceRecord } from '@/api/modules/teacher'

const loading = ref(false)
const exceptions = ref<TeacherAttendanceRecord[]>([])
const filter = ref('')
const showModal = ref(false)
const currentItem = ref<TeacherAttendanceRecord | null>(null)
const form = ref({ result: 'confirm', note: '' })

const statusText: Record<string, string> = { late: '迟到', absent: '缺勤' }

const fetchExceptions = async () => {
  loading.value = true
  try {
    const res = await teacherApi.getExceptions()
    exceptions.value = res.data
  } catch (err) {
    console.error('获取异常列表失败', err)
    alert('获取异常列表失败')
  } finally {
    loading.value = false
  }
}

const filteredList = () => {
  if (!filter.value) return exceptions.value
  return exceptions.value.filter(e => e.status === filter.value)
}

const openReview = (item: TeacherAttendanceRecord) => {
  currentItem.value = item
  form.value = { result: 'confirm', note: '' }
  showModal.value = true
}

const submitReview = async () => {
  if (!currentItem.value) return
  try {
    await teacherApi.submitReview(currentItem.value.id, true, form.value.note)
    showModal.value = false
    fetchExceptions()
  } catch (err: any) {
    alert('复核失败: ' + err.message)
  }
}

const batchReview = async () => {
  const unreviewed = exceptions.value.filter(e => !e.is_reviewed)
  if (unreviewed.length === 0) {
    alert('没有待复核的记录')
    return
  }
  if (!confirm(`确定批量复核 ${unreviewed.length} 条记录？`)) return
  try {
    await Promise.all(unreviewed.map(e => teacherApi.submitReview(e.id, true, '批量确认异常')))
    fetchExceptions()
  } catch (err: any) {
    alert('批量复核失败: ' + err.message)
  }
}

onMounted(fetchExceptions)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
      <div>
        <h1 style="font-size: 24px">异常复核</h1>
        <p style="color: #999">待复核: {{ exceptions.filter(e => !e.is_reviewed).length }} 条</p>
      </div>
      <button class="btn btn-primary" @click="batchReview">批量复核</button>
    </div>

    <!-- 筛选 -->
    <div class="card" style="margin-bottom: 20px">
      <div class="card-body">
        <button :class="'btn ' + (!filter ? 'btn-primary' : 'btn-default')" @click="filter = ''" style="margin-right: 8px">全部</button>
        <button :class="'btn ' + (filter === 'late' ? 'btn-primary' : 'btn-default')" @click="filter = 'late'" style="margin-right: 8px">迟到</button>
        <button :class="'btn ' + (filter === 'absent' ? 'btn-primary' : 'btn-default')" @click="filter = 'absent'">缺勤</button>
        <button class="btn btn-default" style="margin-left: 16px" @click="fetchExceptions" :disabled="loading">刷新</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 60px">加载中...</div>

    <!-- 异常列表 -->
    <div class="card" v-else>
      <table v-if="filteredList().length > 0">
        <thead>
          <tr>
            <th>匿名ID</th>
            <th>姓名</th>
            <th>日期</th>
            <th>状态</th>
            <th>时间</th>
            <th>复核状态</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in filteredList()" :key="e.id" :style="{ background: e.is_reviewed ? '#f6ffed' : 'white' }">
            <td><code style="background: #f5f5f5; padding: 2px 8px; border-radius: 4px">{{ e.anonymous_id }}</code></td>
            <td>{{ e.student_name || '-' }}</td>
            <td>{{ e.time?.slice(0, 10) || '-' }}</td>
            <td>
              <span :class="'tag tag-' + (e.status === 'late' ? 'orange' : 'red')">{{ statusText[e.status] }}</span>
            </td>
            <td>{{ e.time?.slice(11, 19) || '-' }}</td>
            <td>
              <span :class="'tag tag-' + (e.is_reviewed ? 'green' : 'orange')">{{ e.is_reviewed ? '✅ 已复核' : '⏳ 待复核' }}</span>
            </td>
            <td>{{ e.review_note || '-' }}</td>
            <td>
              <button v-if="!e.is_reviewed" class="btn btn-primary" @click="openReview(e)">复核</button>
              <span v-else style="color: #999">已处理</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else style="text-align: center; padding: 40px; color: #999">暂无异常记录</p>
    </div>

    <!-- 弹窗 -->
    <div v-if="showModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000">
      <div style="background: white; padding: 24px; border-radius: 8px; width: 400px">
        <h3 style="margin-bottom: 20px">异常复核</h3>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 20px">
          <div><strong>匿名ID:</strong> {{ currentItem?.anonymous_id }}</div>
          <div><strong>姓名:</strong> {{ currentItem?.student_name || '-' }}</div>
          <div><strong>状态:</strong> {{ statusText[currentItem?.status || 'late'] }}</div>
          <div><strong>时间:</strong> {{ currentItem?.time?.slice(11, 19) || '-' }}</div>
        </div>
        <div class="form-group">
          <label>复核结果</label>
          <select v-model="form.result">
            <option value="confirm">确认异常</option>
            <option value="normal">标记为正常（请假/特殊情况）</option>
          </select>
        </div>
        <div class="form-group">
          <label>备注</label>
          <textarea v-model="form.note" rows="3" style="width: 100%; padding: 8px; border: 1px solid #d9d9d9; border-radius: 4px" placeholder="请输入复核备注..."></textarea>
        </div>
        <div style="display: flex; gap: 12px; margin-top: 24px">
          <button class="btn btn-default" style="flex: 1" @click="showModal = false">取消</button>
          <button class="btn btn-primary" style="flex: 1" @click="submitReview">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>