<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type AdminDevice } from '@/api/modules/admin'

const devices = ref<AdminDevice[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingDevice = ref<AdminDevice | null>(null)
const form = ref({
  device_id: '',
  device_name: '',
  classroom_id: '',
  ip_address: ''
})

const onlineCount = ref(0)
const offlineCount = ref(0)
const errorCount = ref(0)

const fetchDevices = async () => {
  loading.value = true
  try {
    const res = await adminApi.getDevices()
    devices.value = res.data
    onlineCount.value = devices.value.filter(d => d.status === 'online').length
    offlineCount.value = devices.value.filter(d => d.status === 'offline').length
    errorCount.value = devices.value.filter(d => d.status === 'error').length
  } catch (err) {
    console.error('获取设备列表失败', err)
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  editingDevice.value = null
  form.value = { device_id: '', device_name: '', classroom_id: '', ip_address: '' }
  showModal.value = true
}

const openEditModal = (device: AdminDevice) => {
  editingDevice.value = device
  form.value = {
    device_id: device.device_id,
    device_name: device.device_name,
    classroom_id: device.classroom_id,
    ip_address: device.ip_address || ''
  }
  showModal.value = true
}

const saveDevice = async () => {
  try {
    if (editingDevice.value) {
      await adminApi.updateDevice(editingDevice.value.device_id, {
        device_name: form.value.device_name,
        classroom_id: form.value.classroom_id
      })
    } else {
      await adminApi.createDevice({
        device_id: form.value.device_id,
        device_name: form.value.device_name,
        classroom_id: form.value.classroom_id,
        ip_address: form.value.ip_address
      })
    }
    showModal.value = false
    fetchDevices()
  } catch (err: any) {
    alert('保存失败: ' + err.message)
  }
}

const deleteDevice = async (device: AdminDevice) => {
  if (!confirm(`确定删除设备 ${device.device_name}？`)) return
  try {
    await adminApi.deleteDevice(device.device_id)
    fetchDevices()
  } catch (err: any) {
    alert('删除失败: ' + err.message)
  }
}

const checkStatus = async (device: AdminDevice) => {
  try {
    await adminApi.heartbeat(device.device_id, device.ip_address || '')
    alert('已发送心跳检测请求')
    // 延迟刷新列表
    setTimeout(fetchDevices, 1000)
  } catch (err: any) {
    alert('检测失败: ' + err.message)
  }
}

onMounted(fetchDevices)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
      <h1 style="font-size: 24px">设备管理</h1>
      <div>
        <button class="btn btn-default" style="margin-right: 12px" @click="fetchDevices">刷新状态</button>
        <button class="btn btn-primary" @click="openAddModal">+ 新增设备</button>
      </div>
    </div>

    <!-- 设备状态概览 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">设备总数</div>
        <div class="value">{{ devices.length }}</div>
      </div>
      <div class="stat-card">
        <div class="label">在线设备</div>
        <div class="value" style="color: #52c41a">{{ onlineCount }}</div>
      </div>
      <div class="stat-card">
        <div class="label">离线设备</div>
        <div class="value">{{ offlineCount }}</div>
      </div>
      <div class="stat-card">
        <div class="label">异常设备</div>
        <div class="value" style="color: #ff4d4f">{{ errorCount }}</div>
      </div>
    </div>

    <!-- 设备列表 -->
    <div class="card">
      <div v-if="loading" style="padding: 40px; text-align: center">加载中...</div>
      <table v-else>
        <thead>
          <tr>
            <th>设备ID</th>
            <th>设备名称</th>
            <th>所属教室</th>
            <th>状态</th>
            <th>IP地址</th>
            <th>最后心跳</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in devices" :key="d.device_id">
            <td>{{ d.device_id }}</td>
            <td>📷 {{ d.device_name }}</td>
            <td>{{ d.classroom_id }}</td>
            <td>
              <span :class="'status-dot ' + d.status"></span>
              <span :class="'tag tag-' + (d.status === 'online' ? 'green' : d.status === 'error' ? 'red' : 'orange')">
                {{ d.status === 'online' ? '在线' : d.status === 'error' ? '异常' : '离线' }}
              </span>
            </td>
            <td>{{ d.ip_address || '-' }}</td>
            <td>{{ d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleString() : '-' }}</td>
            <td>
              <button class="btn btn-default" @click="checkStatus(d)" style="margin-right: 8px">检查</button>
              <button class="btn btn-default" @click="openEditModal(d)" style="margin-right: 8px">编辑</button>
              <button class="btn btn-danger" @click="deleteDevice(d)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 弹窗 -->
    <div v-if="showModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000">
      <div style="background: white; padding: 24px; border-radius: 8px; width: 400px">
        <h3 style="margin-bottom: 20px">{{ editingDevice ? '编辑设备' : '新增设备' }}</h3>
        <div class="form-group">
          <label>设备ID</label>
          <input v-model="form.device_id" :disabled="!!editingDevice" placeholder="如: DEV001" />
        </div>
        <div class="form-group">
          <label>设备名称</label>
          <input v-model="form.device_name" placeholder="如: 教室1号设备" />
        </div>
        <div class="form-group">
          <label>所属教室</label>
          <input v-model="form.classroom_id" placeholder="如: 一年级1班" />
        </div>
        <div class="form-group">
          <label>IP地址（可选）</label>
          <input v-model="form.ip_address" placeholder="如: 192.168.1.10" />
        </div>
        <div style="display: flex; gap: 12px; margin-top: 24px">
          <button class="btn btn-default" style="flex: 1" @click="showModal = false">取消</button>
          <button class="btn btn-primary" style="flex: 1" @click="saveDevice">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}
</style>