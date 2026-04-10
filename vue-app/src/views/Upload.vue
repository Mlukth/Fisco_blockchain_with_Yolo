<template>
  <div class="min-h-screen flex flex-col">
    <main class="container mx-auto px-4 max-w-3xl py-8 flex-grow">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-white mb-2">考勤数据采集与上链</h2>
        <p class="text-white/80">上传考勤记录文件或手动输入，生成默克尔根并上链存证</p>
      </div>

      <div class="card mb-6">
        <div v-if="status.message" class="mb-4" :class="statusStyles[status.type]">
          <i :class="statusIcon(status.type)"></i>
          <p class="text-sm font-medium">{{ status.message }}</p>
        </div>

        <!-- 数据输入方式选择 -->
        <div class="mb-6">
          <div class="flex space-x-4 mb-4">
            <button @click="mode = 'file'" class="px-4 py-2 rounded-lg font-medium" :class="mode === 'file' ? 'bg-primary text-white' : 'bg-white/20 text-white'">
              <i class="fa fa-file-upload mr-2"></i>上传文件
            </button>
            <button @click="mode = 'manual'" class="px-4 py-2 rounded-lg font-medium" :class="mode === 'manual' ? 'bg-primary text-white' : 'bg-white/20 text-white'">
              <i class="fa fa-edit mr-2"></i>手动输入
            </button>
          </div>

          <!-- 文件上传模式 -->
          <div v-if="mode === 'file'">
            <label class="block text-sm font-medium text-white mb-2">选择考勤数据文件 (JSON 或 CSV)</label>
            <input type="file" accept=".json,.csv,text/csv" @change="handleFileUpload" class="w-full rounded-xl border border-white/30 py-3 px-4 text-white bg-white/20" />
            <p class="mt-2 text-xs text-white/70">文件内容应为考勤记录数组，每条包含学号、时间戳等字段</p>
          </div>

          <!-- 手动输入模式 -->
          <div v-if="mode === 'manual'">
            <label class="block text-sm font-medium text-white mb-2">考勤记录 (JSON 数组)</label>
            <textarea v-model="manualRecords" rows="6" class="w-full rounded-xl border border-white/30 py-3 px-4 text-white bg-white/20 font-mono text-sm" placeholder='[{"studentId":"S001","timestamp":1712345678}, ...]'></textarea>
          </div>
        </div>

        <!-- 考勤日期选择 -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-white mb-2">考勤日期</label>
          <input type="date" v-model="attendanceDateStr" class="w-full rounded-xl border border-white/30 py-3 px-4 text-white bg-white/20" />
        </div>

        <!-- 操作按钮 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button @click="handleGenerateRoot" :disabled="isProcessing || !canGenerate" class="btn-primary py-3 rounded-xl flex items-center justify-center" :class="{ 'opacity-50': isProcessing || !canGenerate }">
            <i v-if="isProcessing" class="fa fa-spinner animate-spin mr-2"></i>
            <i v-else class="fa fa-calculator mr-2"></i>
            生成默克尔根
          </button>
          <button @click="handleUploadRoot" :disabled="isProcessing || !merkleRoot" class="btn-success py-3 rounded-xl flex items-center justify-center" :class="{ 'opacity-50': isProcessing || !merkleRoot }">
            <i v-if="isProcessing" class="fa fa-spinner animate-spin mr-2"></i>
            <i v-else class="fa fa-cloud-upload mr-2"></i>
            上链存证
          </button>
        </div>

        <!-- 默克尔根显示 -->
        <div v-if="merkleRoot" class="bg-white/10 p-4 rounded-xl">
          <h3 class="text-white font-medium mb-2">默克尔根</h3>
          <code class="text-green-300 break-all text-sm">{{ merkleRoot }}</code>
          <button @click="copyToClipboard(merkleRoot)" class="mt-2 text-white/70 hover:text-white text-sm flex items-center"><i class="fa fa-copy mr-1"></i>复制</button>
        </div>
      </div>

      <!-- 说明卡片 -->
      <div class="card p-5 text-white">
        <h4 class="font-medium mb-3">操作说明</h4>
        <ul class="space-y-2 text-sm">
          <li>1. 准备考勤记录（JSON数组），每条包含唯一标识和时间戳</li>
          <li>2. 系统计算所有记录的哈希并构建默克尔树，生成根哈希</li>
          <li>3. 将默克尔根和考勤日期上传至FISCO BCOS区块链永久存证</li>
        </ul>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { attendApi } from '@/api/modules/attend'
import { handleApiError } from '@/utils/errorHandler'

const mode = ref<'file' | 'manual'>('file')
const manualRecords = ref('')
const attendanceDateStr = ref(new Date().toISOString().split('T')[0])
const isProcessing = ref(false)
const merkleRoot = ref('')
const status = ref<{ type: 'success' | 'warning' | 'danger' | 'info' | ''; message: string }>({ type: '', message: '' })
const recordsData = ref<any[]>([])

const statusStyles: Record<string, string> = {
  success: 'bg-green-500/20 text-green-300 border-l-4 border-green-500 p-4 rounded-lg flex items-center',
  warning: 'bg-yellow-500/20 text-yellow-300 border-l-4 border-yellow-500 p-4 rounded-lg flex items-center',
  danger: 'bg-red-500/20 text-red-300 border-l-4 border-red-500 p-4 rounded-lg flex items-center',
  info: 'bg-blue-500/20 text-blue-300 border-l-4 border-blue-500 p-4 rounded-lg flex items-center',
}

const statusIcon = (type: string) => {
  const map: Record<string, string> = { success: 'fa fa-check-circle mr-3', warning: 'fa fa-exclamation-circle mr-3', danger: 'fa fa-times-circle mr-3', info: 'fa fa-info-circle mr-3' }
  return map[type] || 'fa fa-info-circle mr-3'
}

const canGenerate = computed(() => {
  if (mode.value === 'file') return recordsData.value.length > 0
  try {
    const parsed = JSON.parse(manualRecords.value)
    return Array.isArray(parsed) && parsed.length > 0
  } catch { return false }
})

const handleFileUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    if (file.name.endsWith('.json')) {
      recordsData.value = JSON.parse(text)
    } else {
      // 简单CSV解析
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',')
      recordsData.value = lines.slice(1).map(line => {
        const values = line.split(',')
        return headers.reduce((obj, h, i) => ({ ...obj, [h.trim()]: values[i]?.trim() }), {})
      })
    }
    status.value = { type: 'success', message: `已加载 ${recordsData.value.length} 条记录` }
  } catch (err) {
    status.value = { type: 'danger', message: '文件解析失败' }
  }
}

const handleGenerateRoot = async () => {
  let records: any[] = []
  try {
    records = mode.value === 'file' ? recordsData.value : JSON.parse(manualRecords.value)
  } catch {
    status.value = { type: 'danger', message: '记录格式错误' }
    return
  }
  isProcessing.value = true
  try {
    const res = await attendApi.calculateMerkleRoot({ records })
    merkleRoot.value = res.data.merkleRoot
    status.value = { type: 'success', message: '默克尔根生成成功' }
  } catch (err) {
    status.value = { type: 'danger', message: handleApiError(err).message }
  } finally {
    isProcessing.value = false
  }
}

const handleUploadRoot = async () => {
  if (!merkleRoot.value) return
  const attendanceDate = Math.floor(new Date(attendanceDateStr.value).getTime() / 1000)
  isProcessing.value = true
  try {
    const res = await attendApi.uploadMerkleRoot({ merkleRoot: merkleRoot.value, attendanceDate })
    status.value = { type: 'success', message: `上链成功！区块高度: ${res.data.blockHeight}` }
  } catch (err) {
    status.value = { type: 'danger', message: handleApiError(err).message }
  } finally {
    isProcessing.value = false
  }
}

const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)
</script>