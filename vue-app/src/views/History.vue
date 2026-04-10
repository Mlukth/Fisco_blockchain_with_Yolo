<template>
  <div class="min-h-screen">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-white mb-6 flex items-center">
        <i class="fa fa-history mr-3"></i> 考勤存证历史
      </h1>

      <div class="mb-8">
        <div class="flex items-center">
          <div class="relative flex-1 mr-4">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/70">
              <i class="fa fa-search"></i>
            </div>
            <input
              type="text"
              placeholder="搜索默克尔根..."
              v-model="searchTerm"
              class="pl-10 w-full bg-white/20 border border-white/30 rounded-xl py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      <div v-if="filteredHistory.length > 0" class="flex space-x-4 mb-6">
        <button
          @click="handleClearAll"
          :disabled="loading || resetting || deletedCount === 0"
          class="bg-red-600 hover:bg-red-800 text-white font-bold py-3 px-6 rounded-xl transition flex-1 disabled:opacity-50"
        >
          <i v-if="resetting" class="fa fa-spinner animate-spin mr-2"></i>
          <i v-else class="fa fa-trash mr-2"></i>
          清除已删除 ({{ deletedCount }})
        </button>
        <button
          @click="handleFullReset"
          :disabled="loading || resetting"
          class="bg-purple-600 hover:bg-purple-800 text-white font-bold py-3 px-6 rounded-xl transition flex-1 disabled:opacity-50"
        >
          <i v-if="resetting" class="fa fa-spinner animate-spin mr-2"></i>
          <i v-else class="fa fa-bomb mr-2"></i>
          完全重置
        </button>
      </div>

      <div v-if="loading" class="flex justify-center items-center h-64">
        <i class="fa fa-spinner animate-spin text-3xl text-white"></i>
      </div>

      <div v-else-if="filteredHistory.length === 0" class="text-center py-12 text-white/80">
        <i class="fa fa-database text-4xl mx-auto mb-4 text-primary"></i>
        <p class="text-xl">暂无考勤存证记录</p>
        <RouterLink to="/upload" class="mt-4 inline-block bg-white text-primary hover:bg-gray-100 font-bold py-3 px-6 rounded-xl transition">
          去采集考勤
        </RouterLink>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="record in filteredHistory" :key="record.merkleRoot" class="card bg-white/10 rounded-2xl p-6 border border-white/20 relative">
          <div class="absolute top-4 right-4 px-3 py-1 rounded-full text-xs" :class="record.status === 'confirmed' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'">
            {{ record.status === 'confirmed' ? '已上链' : '已删除' }}
          </div>

          <div class="mb-4">
            <h3 class="font-bold text-white truncate">默克尔根</h3>
            <code class="text-xs text-white/80 break-all block mt-1">{{ record.merkleRoot }}</code>
          </div>

          <div class="space-y-2 text-sm">
            <p><span class="text-white/60">考勤日期:</span> {{ formatDate(record.attendanceDate) }}</p>
            <p><span class="text-white/60">上传时间:</span> {{ new Date(record.uploadTime).toLocaleString() }}</p>
            <p v-if="record.blockHeight"><span class="text-white/60">区块高度:</span> {{ record.blockHeight }}</p>
          </div>

          <div class="mt-4 flex justify-end">
            <button
              v-if="record.status === 'confirmed'"
              class="text-red-500 hover:text-red-400 flex items-center"
              @click="handleDelete(record.merkleRoot)"
            >
              <i class="fa fa-trash mr-1"></i> 删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { attendApi } from '@/api/modules/attend'
import { historyApi } from '@/api/modules/history'
import type { AttendanceHistoryRecord } from '@/types/api'

const loading = ref(true)
const resetting = ref(false)
const searchTerm = ref('')
const historyRecords = ref<AttendanceHistoryRecord[]>([])

const filteredHistory = computed(() => {
  if (!searchTerm.value) return historyRecords.value
  return historyRecords.value.filter(r => r.merkleRoot.includes(searchTerm.value))
})
const deletedCount = computed(() => filteredHistory.value.filter(r => r.status === 'deleted').length)

const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString()

const fetchHistory = async () => {
  loading.value = true
  try {
    const res = await attendApi.getAttendanceHistory()
    historyRecords.value = res.data
  } catch (err) {
    console.error('获取历史失败', err)
  } finally {
    loading.value = false
  }
}

const handleDelete = async (merkleRoot: string) => {
  if (!confirm('确定删除此记录？')) return
  try {
    await attendApi.deleteAttendanceRecord(merkleRoot)
    await fetchHistory()
  } catch (err: any) {
    alert('删除失败: ' + err.message)
  }
}

const handleClearAll = async () => {
  if (!confirm('永久删除所有已标记删除的记录？')) return
  resetting.value = true
  try {
    await historyApi.clearAll()
    await fetchHistory()
  } finally {
    resetting.value = false
  }
}

const handleFullReset = async () => {
  if (!confirm('完全重置将删除所有考勤记录和文件，确定吗？')) return
  resetting.value = true
  try {
    await historyApi.resetAll()
    await fetchHistory()
  } finally {
    resetting.value = false
  }
}

onMounted(fetchHistory)
</script>