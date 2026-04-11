<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/modules/admin'

interface CheckItem {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  detail?: string
}

interface LogItem {
  id: number
  user_id: number
  operation: string
  detail: string
  ip_address: string
  created_at: string
}

const checking = ref(false)
const checks = ref<CheckItem[]>([])
const logs = ref<LogItem[]>([])

const statusCount = ref({ ok: 0, warning: 0, error: 0 })

const fetchData = async () => {
  try {
    const [diagRes, logsRes] = await Promise.all([
      adminApi.getDiagnosis(),
      adminApi.getLogs()
    ])
    checks.value = diagRes.data
    logs.value = logsRes.data
    statusCount.value = {
      ok: checks.value.filter(c => c.status === 'ok').length,
      warning: checks.value.filter(c => c.status === 'warning').length,
      error: checks.value.filter(c => c.status === 'error').length
    }
  } catch (err) {
    console.error('获取诊断数据失败', err)
  }
}

const runDiagnosis = async () => {
  checking.value = true
  await fetchData()
  checking.value = false
}

const fixIssue = (name: string) => {
  alert('正在修复: ' + name + '（此功能需后端支持）')
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
      <h1 style="font-size: 24px">系统诊断</h1>
      <button class="btn btn-primary" @click="runDiagnosis" :disabled="checking">
        {{ checking ? '检测中...' : '一键检测' }}
      </button>
    </div>

    <!-- 检测结果概览 -->
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 20px">
      <div class="stat-card" style="border-left: 4px solid #52c41a">
        <div class="label">正常</div>
        <div class="value" style="color: #52c41a">{{ statusCount.ok }}</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #faad14">
        <div class="label">警告</div>
        <div class="value" style="color: #faad14">{{ statusCount.warning }}</div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #ff4d4f">
        <div class="label">错误</div>
        <div class="value" style="color: #ff4d4f">{{ statusCount.error }}</div>
      </div>
    </div>

    <!-- 检测结果详情 -->
    <div class="card" style="margin-bottom: 20px">
      <div class="card-header">检测结果</div>
      <table v-if="checks.length > 0">
        <thead>
          <tr>
            <th>检测项</th>
            <th>状态</th>
            <th>详情</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in checks" :key="c.name">
            <td><strong>{{ c.name }}</strong></td>
            <td>
              <span :class="'tag tag-' + (c.status === 'ok' ? 'green' : c.status === 'warning' ? 'orange' : 'red')">
                {{ c.status === 'ok' ? '✅ 正常' : c.status === 'warning' ? '⚠️ 警告' : '❌ 错误' }}
              </span>
            </td>
            <td>
              <div>{{ c.message }}</div>
              <div style="color: #999; font-size: 12px" v-if="c.detail">{{ c.detail }}</div>
            </td>
            <td>
              <button v-if="c.status !== 'ok'" class="btn btn-primary" @click="fixIssue(c.name)">修复</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else style="text-align: center; padding: 20px; color: #999">暂无诊断数据</p>
    </div>

    <!-- 系统日志 -->
    <div class="card">
      <div class="card-header">📋 系统日志</div>
      <div style="max-height: 300px; overflow-y: auto">
        <div v-for="log in logs" :key="log.id" style="padding: 10px 20px; border-bottom: 1px solid #f0f0f0; font-family: monospace; font-size: 13px">
          <span style="color: #999">{{ log.created_at?.slice(0, 19).replace('T', ' ') }}</span>
          <span style="margin: 0 12px; color: #1890ff">[{{ log.operation }}]</span>
          <span>用户{{ log.user_id }} {{ log.detail || '' }}</span>
        </div>
        <p v-if="logs.length === 0" style="text-align: center; padding: 20px; color: #999">暂无日志</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
</style>