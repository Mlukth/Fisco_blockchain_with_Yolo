<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { parentApi, type ParentStudent } from '@/api/modules/parent'
import { attendApi } from '@/api/modules/attend'

const loading = ref(true)
const children = ref<ParentStudent[]>([])
const selectedChild = ref<ParentStudent | null>(null)
const verifying = ref(false)
const verifyResult = ref<any>(null)

const statusText: Record<string, { text: string; color: string }> = {
  present: { text: '✅ 出勤', color: '#52c41a' },
  late: { text: '⚠️ 迟到', color: '#faad14' },
  absent: { text: '❌ 缺勤', color: '#ff4d4f' },
  leave: { text: '📝 请假', color: '#1890ff' },
  unknown: { text: '❓ 未知', color: '#999' }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await parentApi.getAttendance()
    children.value = res.data
    if (children.value.length > 0) {
      selectedChild.value = children.value[0]
    }
  } catch (err) {
    console.error('获取考勤数据失败', err)
    alert('获取考勤数据失败')
  } finally {
    loading.value = false
  }
}

const verify = async () => {
  const attendance = selectedChild.value?.attendance
  if (!attendance || !attendance.time) {
    alert('今日暂无考勤记录，无法验真')
    return
  }
  if (!attendance.merkleRoot) {
    alert('该考勤记录尚未上链，无法验真')
    return
  }

  verifying.value = true
  verifyResult.value = null
  try {
    const res = await attendApi.verifyMerkleRoot(attendance.merkleRoot)
    verifyResult.value = {
      success: res.exists,
      merkleRoot: res.merkleRoot,
      blockHeight: null, // 后端接口可扩展返回区块高度
      timestamp: res.timestamp ? new Date(res.timestamp * 1000).toLocaleString() : null,
      txHash: null
    }
  } catch (err: any) {
    verifyResult.value = { success: false, error: err.message }
  } finally {
    verifying.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- 加载状态 -->
    <div v-if="loading" style="text-align: center; padding: 60px">加载中...</div>

    <template v-else-if="children.length === 0">
      <div style="text-align: center; padding: 60px; color: #999">
        <p style="font-size: 18px">暂无绑定的孩子信息</p>
        <p style="margin-top: 12px">请联系管理员绑定学生</p>
      </div>
    </template>

    <template v-else>
      <!-- 孩子选择（如有多个） -->
      <div v-if="children.length > 1" style="margin-bottom: 20px">
        <select v-model="selectedChild" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #d9d9d9">
          <option v-for="c in children" :key="c.anonymousId" :value="c">{{ c.name }} ({{ c.class }})</option>
        </select>
      </div>

      <!-- 孩子信息卡片 -->
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px">
        <div style="display: flex; align-items: center; gap: 16px">
          <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px">👦</div>
          <div>
            <h2 style="font-size: 24px; margin-bottom: 4px">{{ selectedChild?.name }}</h2>
            <p style="opacity: 0.9">匿名ID: <code style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px">{{ selectedChild?.anonymousId }}</code></p>
            <p style="opacity: 0.9">班级: {{ selectedChild?.class }}</p>
          </div>
        </div>
      </div>

      <!-- 今日考勤 -->
      <div class="card" style="margin-bottom: 24px">
        <div class="card-header">📅 今日考勤状态</div>
        <div class="card-body" style="text-align: center; padding: 40px">
          <template v-if="selectedChild?.attendance?.status && selectedChild.attendance.status !== 'unknown'">
            <div style="font-size: 48px; margin-bottom: 16px">{{ statusText[selectedChild.attendance.status].text.split(' ')[0] }}</div>
            <div :style="{ fontSize: '24px', color: statusText[selectedChild.attendance.status].color, fontWeight: 'bold', marginBottom: '8px' }">
              {{ statusText[selectedChild.attendance.status].text.split(' ')[1] }}
            </div>
            <div style="color: #999; margin-bottom: 24px">
              考勤时间: {{ selectedChild.attendance.time?.slice(11, 19) || '--:--:--' }} | 教室: {{ selectedChild.class }}
            </div>
            <button class="btn btn-primary" style="padding: 14px 32px; font-size: 16px" @click="verify" :disabled="verifying">
              {{ verifying ? '验真中...' : '🔍 一键验真' }}
            </button>
          </template>
          <template v-else>
            <div style="font-size: 48px; margin-bottom: 16px">❓</div>
            <div style="font-size: 24px; color: #999; margin-bottom: 8px">暂无考勤记录</div>
            <div style="color: #999">今日尚未有考勤数据</div>
          </template>
        </div>
      </div>

      <!-- 验真结果 -->
      <div class="card" v-if="verifyResult">
        <div class="card-header" :style="{ color: verifyResult.success ? '#52c41a' : '#ff4d4f' }">
          {{ verifyResult.success ? '✅ 验真通过' : '❌ 验真失败' }}
        </div>
        <div class="card-body">
          <div v-if="verifyResult.success" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
            <div style="background: #f6ffed; padding: 12px; border-radius: 8px">
              <div style="color: #999; font-size: 12px">默克尔根</div>
              <div style="font-family: monospace; word-break: break-all">{{ verifyResult.merkleRoot }}</div>
            </div>
            <div style="background: #f6ffed; padding: 12px; border-radius: 8px">
              <div style="color: #999; font-size: 12px">上链时间</div>
              <div>{{ verifyResult.timestamp || '未知' }}</div>
            </div>
          </div>
          <div v-else style="color: #ff4d4f; text-align: center; padding: 20px">
            {{ verifyResult.error || '数据校验失败，请联系管理员' }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>