<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/index'

const loading = ref(false)
// 确保 config 有完整的默认值，避免模板访问 undefined
const config = ref({
  blockchainEnabled: true,
  autoSync: true,
  channelUrl: 'http://localhost:8545',
  contractAddress: ''
})

const fetchConfig = async () => {
  loading.value = true
  try {
    const res = await api.get('/admin/config')
    if (res.success && res.data) {
      // 合并返回的数据，保留默认值作为后备
      config.value = { ...config.value, ...res.data }
    }
  } catch (err: any) {
    console.error('获取配置失败', err?.message || err)
    // 不抛出错误，避免页面崩溃，使用默认值继续
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  loading.value = true
  try {
    await api.post('/admin/config', config.value)
    alert('保存成功')
  } catch (err: any) {
    console.error('保存配置失败', err?.message || err)
    alert('保存失败：' + (err?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

onMounted(fetchConfig)
</script>

<template>
  <div>
    <h1 class="page-title">系统配置</h1>
    <div class="card" v-if="config">
      <div class="form-group">
        <label>区块链节点 RPC URL</label>
        <input v-model="config.channelUrl" type="text" placeholder="http://localhost:8545" />
      </div>
      <div class="form-group">
        <label>合约地址</label>
        <input v-model="config.contractAddress" type="text" placeholder="0x..." />
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="config.blockchainEnabled" />
          启用区块链存证
        </label>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="config.autoSync" />
          自动同步考勤数据
        </label>
      </div>
      <button class="btn btn-primary" @click="saveConfig" :disabled="loading">
        {{ loading ? '保存中...' : '保存配置' }}
      </button>
    </div>
    <div v-else class="card">加载配置中...</div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 24px;
  margin-bottom: 20px;
}
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 24px;
  max-width: 500px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}
.form-group input[type="text"] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.checkbox-label input {
  width: auto;
}
.btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  background: white;
  cursor: pointer;
  font-size: 14px;
}
.btn-primary {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}
.btn-primary:hover {
  background: #40a9ff;
}
</style>