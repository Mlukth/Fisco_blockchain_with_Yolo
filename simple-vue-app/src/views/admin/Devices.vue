<template>
  <div class="container">
    <div class="page-header">
      <h2>设备管理</h2>
      <button class="btn btn-primary" @click="openCreateModal">+ 新增设备</button>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>设备ID</th>
          <th>名称</th>
          <th>班级</th>
          <th>IP地址</th>
          <th>状态</th>
          <th>最后心跳</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="device in devices" :key="device.device_id">
          <td>{{ device.device_id }}</td>
          <td>{{ device.device_name }}</td>
          <td>{{ device.classroom_id || '-' }}</td>
          <td>{{ device.ip_address || '-' }}</td>
          <td><span :class="['status-tag', device.status]">{{ device.status }}</span></td>
          <td>{{ formatDate(device.last_heartbeat) }}</td>
          <td>
            <button class="btn-icon" @click="openEditModal(device)">✏️</button>
            <button class="btn-icon" @click="deleteDevice(device.device_id)">🗑️</button>
            <button class="btn-icon" @click="sendHeartbeat(device.device_id)">💓</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ isEdit ? '编辑设备' : '新增设备' }}</h3>
        <form @submit.prevent="submitForm">
          <div class="form-group">
            <label>设备ID *</label>
            <input v-model="form.device_id" type="text" required :disabled="isEdit" />
          </div>
          <div class="form-group">
            <label>设备名称</label>
            <input v-model="form.device_name" type="text" required />
          </div>
          <div class="form-group">
            <label>班级</label>
            <input v-model="form.classroom_id" type="text" />
          </div>
          <div class="form-group">
            <label>IP地址</label>
            <input v-model="form.ip_address" type="text" />
          </div>
          <div class="form-group" v-if="isEdit">
            <label>状态</label>
            <select v-model="form.status">
              <option value="online">在线</option>
              <option value="offline">离线</option>
              <option value="error">异常</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? '提交中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDevices, createDevice, updateDevice, deleteDevice as delDevice } from '@/api/admin'
import request from '@/api/request'

const devices = ref([])
const showModal = ref(false)
const isEdit = ref(false)
const loading = ref(false)
const form = ref({ device_id: '', device_name: '', classroom_id: '', ip_address: '', status: 'offline' })

onMounted(fetchDevices)

async function fetchDevices() {
  const res = await getDevices()
  devices.value = res.data
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

function openCreateModal() {
  isEdit.value = false
  form.value = { device_id: '', device_name: '', classroom_id: '', ip_address: '', status: 'offline' }
  showModal.value = true
}

function openEditModal(device) {
  isEdit.value = true
  form.value = { ...device }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function submitForm() {
  loading.value = true
  try {
    if (isEdit.value) {
      await updateDevice(form.value.device_id, {
        device_name: form.value.device_name,
        classroom_id: form.value.classroom_id,
        ip_address: form.value.ip_address,
        status: form.value.status
      })
    } else {
      await createDevice(form.value)
    }
    closeModal()
    fetchDevices()
  } catch (e) {
    alert(e.message || '操作失败')
  } finally {
    loading.value = false
  }
}

async function deleteDevice(id) {
  if (!confirm('确定删除该设备吗？')) return
  try {
    await delDevice(id)
    fetchDevices()
  } catch (e) {
    alert(e.message)
  }
}

async function sendHeartbeat(id) {
  try {
    await request.post('/admin/devices/heartbeat', { device_id: id })
    fetchDevices()
  } catch (e) {
    alert('心跳更新失败')
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.data-table { width: 100%; background: white; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.data-table th, .data-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #ebeef5; }
.data-table th { background: #f5f7fa; font-weight: 500; }
.status-tag { padding: 4px 12px; border-radius: 20px; font-size: 12px; background: #e1f3d8; color: #67c23a; }
.status-tag.offline { background: #f4f4f5; color: #909399; }
.status-tag.error { background: #fef0f0; color: #f56c6c; }
.btn-icon { background: none; border: none; cursor: pointer; margin-right: 10px; font-size: 16px; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; padding: 30px; width: 400px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #dcdfe6; border-radius: 6px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
</style>