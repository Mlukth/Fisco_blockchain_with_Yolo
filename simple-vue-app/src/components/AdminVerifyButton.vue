<template>
  <div class="verify-section">
    <button class="btn btn-warning" @click="runVerify" :disabled="loading">
      {{ loading ? '检测中...' : '🔒 数据完整性检测' }}
    </button>
    <div v-if="result" class="verify-result" :class="result.ok ? 'success' : 'warning'">
      {{ result.message }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { verifyAll } from '@/api/admin'

const loading = ref(false)
const result = ref(null)

async function runVerify() {
  loading.value = true
  result.value = null
  try {
    const res = await verifyAll()
    const { totalRecords, mismatchBatches } = res.data
    if (mismatchBatches === 0) {
      result.value = { ok: true, message: `✅ 检测完成，${totalRecords} 条记录均完整可信` }
    } else {
      result.value = { ok: false, message: `⚠️ 发现 ${mismatchBatches} 个异常批次，涉及 ${totalRecords} 条记录，请检查数据库` }
    }
  } catch (e) {
    result.value = { ok: false, message: '❌ 检测失败，请稍后重试' }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.verify-section { margin: 20px 0; }
.btn-warning { background: #e6a23c; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; }
.verify-result { margin-top: 15px; padding: 12px 20px; border-radius: 8px; }
.verify-result.success { background: #f0f9eb; color: #67c23a; border-left: 4px solid #67c23a; }
.verify-result.warning { background: #fdf6ec; color: #e6a23c; border-left: 4px solid #e6a23c; }
</style>