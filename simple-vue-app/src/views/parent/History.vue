<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { parentApi, type ParentStudent, type ParentHistoryRecord } from '@/api/modules/parent'
import { attendApi } from '@/api/modules/attend'
import { ElMessage } from 'element-plus'

const loading = ref(true)
const children = ref<ParentStudent[]>([])
const selectedAnonymousId = ref<string>('')
const month = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM

const summary = ref({ present: 0, late: 0, absent: 0, leave: 0 })
const records = ref<ParentHistoryRecord[]>([])
const studentInfo = ref<{ name: string; anonymousId: string; class: string } | null>(null)

const verifyingBatch = ref(false)
const verifyingSingle = ref<Record<string, boolean>>({})

const statusText: Record<string, { text: string; class: string }> = {
  present: { text: '✅ 出勤', class: 'tag-green' },
  late: { text: '⚠️ 迟到', class: 'tag-orange' },
  absent: { text: '❌ 缺勤', class: 'tag-red' },
  leave: { text: '📝 请假', class: 'tag-blue' }
}

const fetchChildren = async () => {
  try {
    const res = await parentApi.getAttendance()
    children.value = res.data
    if (children.value.length > 0 && !selectedAnonymousId.value) {
      selectedAnonymousId.value = children.value[0].anonymousId
    }
  } catch (err) {
    console.error('获取孩子列表失败', err)
  }
}

const fetchHistory = async () => {
  if (!selectedAnonymousId.value) return
  loading.value = true
  try {
    const res = await parentApi.getHistory(selectedAnonymousId.value, month.value)
    summary.value = res.data.summary
    records.value = res.data.records
    studentInfo.value = res.data.student
  } catch (err) {
    console.error('获取历史记录失败', err)
    ElMessage.error('获取历史记录失败')
  } finally {
    loading.value = false
  }
}

/**
 * 单条验真
 */
const verifyRecord = async (record: ParentHistoryRecord) => {
  if (!record.merkleRoot) {
    ElMessage.warning('该记录尚未上链，无法验真')
    return
  }
  const key = String(record.id)
  verifyingSingle.value[key] = true
  try {
    const res = await attendApi.verifyMerkleRoot(record.merkleRoot)
    if (res.exists) {
      const timeStr = res.timestamp ? new Date(res.timestamp * 1000).toLocaleString() : '未知时间'
      ElMessage.success(`验真成功：该记录于 ${timeStr} 上链，不可篡改`)
    } else {
      ElMessage.error('验真失败：该记录未上链或已被篡改')
    }
  } catch (err: any) {
    ElMessage.error('验真失败：' + (err.message || '网络错误'))
  } finally {
    verifyingSingle.value[key] = false
  }
}

/**
 * 批量验真（月度记录）
 */
const batchVerify = async () => {
  // 过滤出有 merkleRoot 的记录
  const validRecords = records.value.filter(r => r.merkleRoot)
  if (validRecords.length === 0) {
    ElMessage.warning('当前月份没有可验真的记录（均未上链）')
    return
  }

  verifyingBatch.value = true
  const merkleRootList = validRecords.map(r => r.merkleRoot!)
  try {
    const res = await attendApi.batchVerifyMerkleRoot(merkleRootList)
    ElMessage.success({
      message: `批量验真完成：有效存证 ${res.validCount} 条，无效 ${res.invalidCount} 条`,
      duration: 5000
    })
    // 可进一步在界面上标记哪些记录验证通过/失败，此处仅做提示
  } catch (err: any) {
    ElMessage.error('批量验真失败：' + (err.message || '网络错误'))
  } finally {
    verifyingBatch.value = false
  }
}

watch([selectedAnonymousId, month], () => {
  if (selectedAnonymousId.value) {
    fetchHistory()
  }
})

onMounted(async () => {
  await fetchChildren()
  if (selectedAnonymousId.value) {
    fetchHistory()
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 style="font-size: 24px; margin-bottom: 20px">历史记录 - {{ studentInfo?.name || '选择孩子' }}</h1>

    <!-- 孩子选择和月份 -->
    <div class="card" style="margin-bottom: 20px">
      <div class="card-body" style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap">
        <div style="display: flex; align-items: center; gap: 8px">
          <label>选择孩子:</label>
          <select v-model="selectedAnonymousId" style="padding: 8px 16px; border: 1px solid #d9d9d9; border-radius: 4px" :disabled="children.length === 0">
            <option v-for="c in children" :key="c.anonymousId" :value="c.anonymousId">{{ c.name }} ({{ c.class }})</option>
          </select>
        </div>
        <div style="display: flex; align-items: center; gap: 8px">
          <label>选择月份:</label>
          <input type="month" v-model="month" style="padding: 8px; border: 1px solid #d9d9d9; border-radius: 4px" />
        </div>
        <button class="btn btn-primary" @click="fetchHistory" :disabled="loading">查询</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 60px">加载中...</div>

    <template v-else-if="!selectedAnonymousId">
      <div style="text-align: center; padding: 60px; color: #999">请先绑定学生信息</div>
    </template>

    <template v-else>
      <!-- 月度统计 -->
      <div class="stats-grid" style="margin-bottom: 20px">
        <div class="stat-card" style="border-top: 4px solid #52c41a">
          <div class="value">{{ summary.present }}</div>
          <div class="label">出勤天数</div>
        </div>
        <div class="stat-card" style="border-top: 4px solid #faad14">
          <div class="value" style="color: #faad14">{{ summary.late }}</div>
          <div class="label">迟到次数</div>
        </div>
        <div class="stat-card" style="border-top: 4px solid #ff4d4f">
          <div class="value" style="color: #ff4d4f">{{ summary.absent }}</div>
          <div class="label">缺勤天数</div>
        </div>
        <div class="stat-card" style="border-top: 4px solid #1890ff">
          <div class="value" style="color: #1890ff">{{ summary.leave }}</div>
          <div class="label">请假天数</div>
        </div>
      </div>

      <!-- 批量验真按钮 -->
      <div style="margin-bottom: 16px">
        <button class="btn btn-primary" @click="batchVerify" :disabled="verifyingBatch">
          {{ verifyingBatch ? '验真中...' : '🔍 一键批量验真（月度记录）' }}
        </button>
      </div>

      <!-- 历史记录表格 -->
      <div class="card">
        <div class="card-header">📋 考勤记录</div>
        <table v-if="records.length > 0">
          <thead>
            <tr>
              <th>日期</th>
              <th>星期</th>
              <th>状态</th>
              <th>考勤时间</th>
              <th>验真状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td><strong>{{ r.time?.slice(0, 10) }}</strong></td>
              <td>{{ new Date(r.time).toLocaleDateString('zh-CN', { weekday: 'long' }) }}</td>
              <td><span :class="statusText[r.status]?.class">{{ statusText[r.status]?.text }}</span></td>
              <td>{{ r.time?.slice(11, 19) }}</td>
              <td>
                <span v-if="r.merkleRoot" class="tag tag-green">✅ 已上链</span>
                <span v-else class="tag tag-orange">⏳ 待上链</span>
              </td>
              <td>
                <button
                  class="btn btn-default"
                  @click="verifyRecord(r)"
                  :disabled="verifyingSingle[String(r.id)]"
                >
                  {{ verifyingSingle[String(r.id)] ? '验证中' : '验真' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else style="text-align: center; padding: 40px; color: #999">该月暂无考勤记录</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}
.value {
  font-size: 32px;
  font-weight: bold;
}
.label {
  color: #999;
  margin-top: 8px;
}
</style>