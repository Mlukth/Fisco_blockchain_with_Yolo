<template>
  <div class="config-page">
    <div class="page-header">
      <h1 class="page-title">系统配置</h1>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">❌</span>
      <span>配置加载失败</span>
    </div>

    <template v-else-if="config">
      <div class="config-card">
        <div class="config-section">
          <h3 class="section-title">🔗 区块链存证</h3>
          <div class="config-list">
            <div class="config-item">
              <span class="config-label">区块链存证</span>
              <span class="config-value">
                <span class="status-badge" :class="config.blockchainEnabled ? 'enabled' : 'disabled'">
                  <span class="status-dot"></span>
                  {{ config.blockchainEnabled ? '已启用' : '已禁用' }}
                </span>
              </span>
            </div>
            <div class="config-item">
              <span class="config-label">自动同步</span>
              <span class="config-value">
                <span class="status-badge" :class="config.autoSync ? 'enabled' : 'disabled'">
                  <span class="status-dot"></span>
                  {{ config.autoSync ? '已启用' : '已禁用' }}
                </span>
              </span>
            </div>
            <div class="config-item">
              <span class="config-label">区块链节点地址</span>
              <span class="config-value address">{{ config.channelUrl || '未配置' }}</span>
            </div>
            <div class="config-item">
              <span class="config-label">合约地址</span>
              <span class="config-value address">{{ config.contractAddress || '未部署' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api/request'

const config = ref(null)
const loading = ref(true)
const error = ref(false)

async function fetchConfig() {
  try {
    const res = await request.get('/admin/config')
    config.value = res.data
  } catch (e) {
    console.error('获取配置失败', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchConfig)
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  color: #86909C;
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E6EB;
  border-top-color: #0066CC;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  color: #F56C6C;
}

.error-icon {
  font-size: 32px;
}

.config-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.config-section {
  padding: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
  padding: 20px 24px;
  background: #F5F7FA;
  border-bottom: 1px solid #E5E6EB;
}

.config-list {
  padding: 0 24px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid #F0F2F5;
}

.config-item:last-child {
  border-bottom: none;
}

.config-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.config-value {
  font-size: 14px;
  color: #1D2129;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-badge.enabled {
  background: #E1F3D8;
  color: #67C23A;
}

.status-badge.disabled {
  background: #FEF0F0;
  color: #F56C6C;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.address {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  color: #0066CC;
  background: #F5F7FA;
  padding: 4px 10px;
  border-radius: 4px;
}
</style>