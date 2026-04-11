<script setup lang="ts">
import { ref } from 'vue'

const form = ref({
  anonymousId: '',
  date: '',
  merkleProof: ''
})

const result = ref<any>(null)
const loading = ref(false)

function verify() {
  if (!form.value.anonymousId || !form.value.date) {
    alert('请填写匿名ID和日期')
    return
  }
  
  loading.value = true
  setTimeout(() => {
    result.value = {
      success: true,
      data: {
        status: 'present',
        time: '07:55:23',
        merkleRoot: '0x1a2b3c4d5e6f...',
        blockHeight: 12345,
        timestamp: form.value.date + ' 08:00:00',
        verified: true
      }
    }
    loading.value = false
  }, 1500)
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar" style="background: #001529">
      <div class="sidebar-header">🔍 考勤验真</div>
      <nav>
        <router-link to="/verify"><div class="active">考勤验真</div></router-link>
        <router-link to="/batch-verify"><div>批量验真</div></router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="header">
        <span>智慧课堂考勤系统 - 考勤验真</span>
      </header>
      <main class="content">
        <div class="card" style="max-width: 600px; margin: 40px auto">
          <div class="card-header">📝 输入验真信息</div>
          <div class="card-body">
            <div class="form-group">
              <label>匿名ID</label>
              <input v-model="form.anonymousId" placeholder="如: A1B2C3D4" />
            </div>
            <div class="form-group">
              <label>考勤日期</label>
              <input type="date" v-model="form.date" />
            </div>
            <div class="form-group">
              <label>默克尔证明（可选）</label>
              <textarea v-model="form.merkleProof" rows="3" style="width: 100%; padding: 8px; border: 1px solid #d9d9d9; border-radius: 4px" placeholder="如有默克尔证明请粘贴..."></textarea>
            </div>
            <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 16px; margin-top: 8px" @click="verify" :disabled="loading">
              {{ loading ? '验真中...' : '🔍 开始验真' }}
            </button>
          </div>
        </div>
        
        <!-- 验真结果 -->
        <div class="card" style="max-width: 600px; margin: 0 auto" v-if="result">
          <div class="card-header" :style="{ color: result.success ? '#52c41a' : '#ff4d4f' }">
            {{ result.success ? '✅ 验真通过' : '❌ 验真失败' }}
          </div>
          <div class="card-body" v-if="result.success">
            <div style="display: grid; gap: 12px">
              <div style="display: flex; justify-content: space-between; padding: 12px; background: #f6ffed; border-radius: 8px">
                <span style="color: #999">考勤状态</span>
                <span class="tag tag-green">{{ result.data.status === 'present' ? '出勤' : result.data.status }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px; background: #f6ffed; border-radius: 8px">
                <span style="color: #999">考勤时间</span>
                <span>{{ result.data.time }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px; background: #f6ffed; border-radius: 8px">
                <span style="color: #999">默克尔根</span>
                <span style="font-family: monospace">{{ result.data.merkleRoot }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px; background: #f6ffed; border-radius: 8px">
                <span style="color: #999">区块高度</span>
                <span>{{ result.data.blockHeight }}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px; background: #f6ffed; border-radius: 8px">
                <span style="color: #999">链上时间</span>
                <span>{{ result.data.timestamp }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
