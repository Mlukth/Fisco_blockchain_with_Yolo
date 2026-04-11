<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/modules/admin'

const config = ref({
  blockchain: {
    channelUrl: '',
    groupId: '',
    chainId: '',
    contractAddress: ''
  },
  system: {
    attendanceTimeout: 30,
    autoBackup: true,
    backupPath: '/data/backup'
  }
})

const backups = ref<{ name: string; size: string; time: string }[]>([])
const saving = ref(false)
const loading = ref(false)

const fetchConfig = async () => {
  loading.value = true
  try {
    const res = await adminApi.getConfig()
    config.value = res.data
  } catch (err) {
    console.error('获取配置失败', err)
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    await adminApi.saveConfig(config.value)
    alert('配置保存成功！')
  } catch (err: any) {
    alert('保存失败: ' + err.message)
  } finally {
    saving.value = false
  }
}

const createBackup = () => {
  alert('正在创建备份...（此功能需后端支持）')
}

const restoreBackup = (name: string) => {
  if (confirm('确定恢复到 ' + name + ' ？')) {
    alert('恢复成功！（此功能需后端支持）')
  }
}

onMounted(fetchConfig)
</script>

<template>
  <div>
    <h1 style="font-size: 24px; margin-bottom: 20px">系统配置</h1>
    <div v-if="loading" style="text-align: center; padding: 40px">加载中...</div>
    <template v-else>
      <!-- 区块链配置 -->
      <div class="card" style="margin-bottom: 20px">
        <div class="card-header">⛓️ 区块链配置</div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
            <div class="form-group">
              <label>Channel URL</label>
              <input v-model="config.blockchain.channelUrl" />
            </div>
            <div class="form-group">
              <label>群组ID</label>
              <input v-model="config.blockchain.groupId" />
            </div>
            <div class="form-group">
              <label>链ID</label>
              <input v-model="config.blockchain.chainId" />
            </div>
            <div class="form-group">
              <label>合约地址</label>
              <input v-model="config.blockchain.contractAddress" />
            </div>
          </div>
        </div>
      </div>

      <!-- 系统参数 -->
      <div class="card" style="margin-bottom: 20px">
        <div class="card-header">⚙️ 系统参数</div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
            <div class="form-group">
              <label>考勤超时时间（分钟）</label>
              <input v-model.number="config.system.attendanceTimeout" type="number" />
            </div>
            <div class="form-group">
              <label>备份路径</label>
              <input v-model="config.system.backupPath" />
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label style="display: flex; align-items: center; gap: 8px">
                <input type="checkbox" v-model="config.system.autoBackup" />
                启用自动备份（每日 00:00）
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据备份 -->
      <div class="card" style="margin-bottom: 20px">
        <div class="card-header">
          💾 数据备份
          <button class="btn btn-primary" style="float: right" @click="createBackup">立即备份</button>
        </div>
        <div class="card-body">
          <table v-if="backups.length > 0">
            <thead>
              <tr><th>备份文件</th><th>大小</th><th>备份时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="b in backups" :key="b.name">
                <td>📁 {{ b.name }}</td>
                <td>{{ b.size }}</td>
                <td>{{ b.time }}</td>
                <td><button class="btn btn-default" @click="restoreBackup(b.name)">恢复</button></td>
              </tr>
            </tbody>
          </table>
          <p v-else style="color: #999; text-align: center">暂无备份文件</p>
        </div>
      </div>

      <!-- 保存按钮 -->
      <div style="text-align: right">
        <button class="btn btn-primary" style="padding: 12px 32px; font-size: 16px" @click="saveConfig" :disabled="saving">
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </template>
  </div>
</template>