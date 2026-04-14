<template>
  <div class="container">
    <h2>系统配置</h2>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="config" class="card">
      <div class="config-item">
        <label>区块链存证</label>
        <span :class="config.blockchainEnabled ? 'enabled' : 'disabled'">
          {{ config.blockchainEnabled ? '已启用' : '已禁用' }}
        </span>
      </div>
      <div class="config-item">
        <label>自动同步</label>
        <span :class="config.autoSync ? 'enabled' : 'disabled'">
          {{ config.autoSync ? '已启用' : '已禁用' }}
        </span>
      </div>
      <div class="config-item">
        <label>区块链节点地址</label>
        <span>{{ config.channelUrl || '未配置' }}</span>
      </div>
      <div class="config-item">
        <label>合约地址</label>
        <span class="address">{{ config.contractAddress || '未部署' }}</span>
      </div>
    </div>
    <div v-else class="error">配置加载失败</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api/request'

const config = ref(null)
const loading = ref(true)

async function fetchConfig() {
  try {
    const res = await request.get('/admin/config')
    // 注意：request 拦截器已返回 res.data，即 { blockchainEnabled, ... }
    config.value = res.data
  } catch (e) {
    console.error('获取配置失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchConfig)
</script>

<style scoped>
.config-item {
  display: flex;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
}
.config-item:last-child {
  border-bottom: none;
}
label {
  font-weight: 500;
  color: #606266;
}
.enabled {
  color: #67c23a;
}
.disabled {
  color: #f56c6c;
}
.address {
  font-family: monospace;
  font-size: 14px;
}
.loading, .error {
  text-align: center;
  padding: 40px;
  color: #909399;
}
</style>