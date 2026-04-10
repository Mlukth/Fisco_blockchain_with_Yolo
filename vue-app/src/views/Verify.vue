<template>
  <div class="min-h-screen flex flex-col">
    <main class="container mx-auto px-4 max-w-3xl py-8 flex-grow">
      <div class="bg-white/10 rounded-xl p-6 md:p-8 mb-6">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-white mb-2">考勤验真工具</h2>
          <p class="text-white/70">验证默克尔根是否已存证在区块链</p>
        </div>

        <div v-if="status.message" class="mb-4 p-4 rounded-lg flex items-center" :class="{
          'bg-green-500/20 text-green-300': status.type === 'success',
          'bg-yellow-500/20 text-yellow-300': status.type === 'warning',
          'bg-red-500/20 text-red-300': status.type === 'danger',
          'bg-blue-500/20 text-blue-300': status.type === 'info'
        }">
          <i :class="statusIcon(status.type)"></i>
          <p>{{ status.message }}</p>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-white mb-2">输入默克尔根</label>
          <input
            type="text"
            v-model="merkleRoot"
            placeholder="0x开头的64位十六进制字符串"
            class="w-full rounded-xl border border-white/30 py-3 px-4 text-white bg-white/20 placeholder-white/50 font-mono"
          />
        </div>

        <button
          @click="handleVerify"
          :disabled="isProcessing || !isValidRoot"
          class="w-full py-3 px-6 rounded-xl font-medium transition bg-secondary hover:bg-secondary/80 text-white disabled:opacity-50 flex items-center justify-center"
        >
          <i v-if="isProcessing" class="fa fa-spinner animate-spin mr-2"></i>
          <i v-else class="fa fa-check-circle mr-2"></i>
          验证
        </button>

        <div v-if="verifyResult" class="mt-6 p-4 rounded-lg" :class="verifyResult.exists ? 'bg-green-500/20 border border-green-500' : 'bg-yellow-500/20 border border-yellow-500'">
          <div class="flex items-center">
            <i :class="verifyResult.exists ? 'fa fa-check-circle text-green-400 mr-2' : 'fa fa-exclamation-circle text-yellow-400 mr-2'"></i>
            <span class="font-medium text-white">{{ verifyResult.message }}</span>
          </div>
          <div v-if="verifyResult.exists && verifyResult.timestamp" class="mt-2 text-white/70 text-sm">
            存证时间: {{ new Date(verifyResult.timestamp * 1000).toLocaleString() }}
          </div>
        </div>
      </div>

      <div class="bg-white/10 rounded-xl p-5 text-white">
        <h4 class="font-medium mb-3">验真说明</h4>
        <p class="text-sm">输入从考勤采集环节获得的默克尔根，系统将查询FISCO BCOS区块链，确认该根哈希是否已存证。</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { attendApi } from '@/api/modules/attend'
import { handleApiError } from '@/utils/errorHandler'

const merkleRoot = ref('')
const isProcessing = ref(false)
const status = ref<{ type: 'success' | 'warning' | 'danger' | 'info' | ''; message: string }>({ type: '', message: '' })
const verifyResult = ref<{ exists: boolean; timestamp: number | null; message: string } | null>(null)

const isValidRoot = computed(() => /^0x[a-fA-F0-9]{64}$/.test(merkleRoot.value))

const statusIcon = (type: string) => {
  const map: Record<string, string> = { success: 'fa fa-check-circle mr-3', warning: 'fa fa-exclamation-circle mr-3', danger: 'fa fa-times-circle mr-3', info: 'fa fa-info-circle mr-3' }
  return map[type] || 'fa fa-info-circle mr-3'
}

const handleVerify = async () => {
  if (!isValidRoot.value) {
    status.value = { type: 'danger', message: '默克尔根格式无效' }
    return
  }
  isProcessing.value = true
  status.value = { type: 'info', message: '正在查询区块链...' }
  try {
    const res = await attendApi.verifyMerkleRoot({ merkleRoot: merkleRoot.value })
    verifyResult.value = {
      exists: res.data.exists,
      timestamp: res.data.timestamp,
      message: res.data.message
    }
    status.value = { type: res.data.exists ? 'success' : 'warning', message: res.data.message }
  } catch (err) {
    const msg = handleApiError(err).message
    status.value = { type: 'danger', message: msg }
    verifyResult.value = { exists: false, timestamp: null, message: msg }
  } finally {
    isProcessing.value = false
  }
}
</script>