<template>
  <div class="devices-page">
    <div class="page-header">
      <h1 class="page-title">设备管理</h1>
      <button class="btn-add" @click="openCreateModal">
        <span>+</span> 新增设备
      </button>
    </div>

    <div class="table-card">
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
            <td class="device-id">{{ device.device_id }}</td>
            <td class="device-name">{{ device.device_name }}</td>
            <td>{{ device.classroom_id || '-' }}</td>
            <td class="ip-address">{{ device.ip_address || '-' }}</td>
            <td>
              <span class="status-tag" :class="device.status">
                <span class="status-dot"></span>
                {{ device.status }}
              </span>
            </td>
            <td class="time">{{ formatDate(device.last_heartbeat) }}</td>
            <td class="actions">
              <button class="btn-icon edit" @click="openEditModal(device)" title="编辑">✏️</button>
              <button class="btn-icon delete" @click="deleteDevice(device.device_id)" title="删除">🗑️</button>
              <button class="btn-icon heartbeat" @click="sendHeartbeat(device.device_id)" title="发送心跳">💓</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">{{ isEdit ? '编辑设备' : '新增设备' }}</h2>
        <div class="form-group">
          <label>设备ID <span class="required">*</span></label>
          <input v-model="form.device_id" type="text" :disabled="isEdit" placeholder="请输入设备ID" />
        </div>
        <div class="form-group">
          <label>设备名称 <span class="required">*</span></label>
          <input v-model="form.device_name" type="text" placeholder="请输入设备名称" />
        </div>
        <div class="form-group">
          <label>班级</label>
          <input v-model="form.classroom_id" type="text" placeholder="请输入班级编号" />
        </div>
        <div class="form-group">
          <label>IP地址</label>
          <input v-model="form.ip_address" type="text" placeholder="请输入IP地址" />
        </div>
        <div class="form-group">
          <label>状态</label>
          <div class="status-select">
            <label class="radio-label">
              <input type="radio" v-model="form.status" value="online" />
              <span class="radio-box online"></span>在线
            </label>
            <label class="radio-label">
              <input type="radio" v-model="form.status" value="offline" />
              <span class="radio-box offline"></span>离线
            </label>
            <label class="radio-label">
              <input type="radio" v-model="form.status" value="error" />
              <span class="radio-box error"></span>异常
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-submit" @click="submitForm" :disabled="loading">
            {{ loading ? '提交中...' : '保存' }}
          </button>
        </div>
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
const form = ref({
  device_id: '',
  device_name: '',
  classroom_id: '',
  ip_address: '',
  status: 'offline'
})

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
  form.value = {
    device_id: '',
    device_name: '',
    classroom_id: '',
    ip_address: '',
    status: 'offline'
  }
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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.btn-add {
  padding: 10px 20px;
  background: #0066CC;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #0052AA;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-add span {
  font-size: 18px;
  font-weight: bold;
}

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #F0F2F5;
}

.data-table th {
  background: #F5F7FA;
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.data-table tbody tr:hover {
  background: #EEF7FF;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.device-id {
  font-family: monospace;
  color: #0066CC;
}

.device-name {
  font-weight: 500;
  color: #1D2129;
}

.ip-address {
  font-family: monospace;
  color: #606266;
}

.time {
  color: #86909C;
  font-size: 13px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.online {
  background: #E1F3D8;
  color: #67C23A;
}

.status-tag.offline {
  background: #F4F4F5;
  color: #909399;
}

.status-tag.error {
  background: #FEF0F0;
  color: #F56C6C;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #F5F7FA;
}

.btn-icon.edit:hover {
  color: #0066CC;
}

.btn-icon.delete:hover {
  color: #F56C6C;
}

.btn-icon.heartbeat:hover {
  color: #E6A23C;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 440px;
  max-width: 90%;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1D2129;
  margin: 0 0 24px 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.required {
  color: #F56C6C;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #E5E6EB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.form-group input:disabled {
  background: #F5F7FA;
  color: #909399;
  cursor: not-allowed;
}

.status-select {
  display: flex;
  gap: 20px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
}

.radio-label input {
  display: none;
}

.radio-box {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #E5E6EB;
  transition: all 0.2s;
}

.radio-label input:checked + .radio-box.online {
  border-color: #67C23A;
  background: #67C23A;
}

.radio-label input:checked + .radio-box.offline {
  border-color: #909399;
  background: #909399;
}

.radio-label input:checked + .radio-box.error {
  border-color: #F56C6C;
  background: #F56C6C;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel {
  padding: 10px 20px;
  background: white;
  border: 1px solid #E5E6EB;
  color: #606266;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  border-color: #909399;
}

.btn-submit {
  padding: 10px 24px;
  background: #0066CC;
  border: none;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover:not(:disabled) {
  background: #0052AA;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>