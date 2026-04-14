<template>
  <div class="users-page">
    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <button class="btn-add" @click="openCreateModal">
        <span>+</span> 新增用户
      </button>
    </div>

    <div class="filter-bar">
      <button
        v-for="role in roles"
        :key="role.value"
        class="filter-btn"
        :class="{ active: roleFilter === role.value }"
        @click="roleFilter = role.value; fetchUsers()"
      >
        {{ role.label }}
      </button>
    </div>

    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>角色</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td class="user-id">{{ user.id }}</td>
            <td class="username">{{ user.username }}</td>
            <td>
              <span class="role-tag" :class="user.role">
                {{ getRoleLabel(user.role) }}
              </span>
            </td>
            <td class="time">{{ formatDate(user.created_at) }}</td>
            <td class="actions">
              <button class="btn-link edit" @click="openEditModal(user)">编辑</button>
              <button class="btn-link delete" @click="deleteUser(user.id)">删除</button>
              <button v-if="user.role === 'parent'" class="btn-icon" @click="openBindingModal(user)" title="管理绑定">🔗</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">{{ isEdit ? '编辑用户' : '新增用户' }}</h2>
        <div class="form-group">
          <label>用户名 <span class="required">*</span></label>
          <input v-model="form.username" type="text" :disabled="isEdit" placeholder="请输入用户名" />
        </div>
        <div v-if="!isEdit" class="form-group">
          <label>密码 <span class="required">*</span></label>
          <input v-model="form.password" type="password" placeholder="请输入密码" />
        </div>
        <div class="form-group">
          <label>角色 <span class="required">*</span></label>
          <div class="role-select">
            <label class="radio-label" v-for="r in roles.slice(1)" :key="r.value">
              <input type="radio" v-model="form.role" :value="r.value" />
              <span class="role-box" :class="r.value">{{ r.label }}</span>
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

    <div v-if="showBindingModal" class="modal-overlay" @click.self="closeBindingModal">
      <div class="modal binding-modal">
        <h2 class="modal-title">绑定管理 - {{ currentParent?.username }}</h2>

        <div class="binding-section">
          <h4>已绑定孩子</h4>
          <div v-if="bindings.length === 0" class="empty-hint">暂无绑定</div>
          <ul class="binding-list" v-else>
            <li v-for="b in bindings" :key="b.student_name">
              <span class="child-info">{{ b.student_name }} ({{ b.anonymous_id }}) - {{ b.class_name || '未分班' }}</span>
              <button class="btn-unbind" @click="unbindChild(b.anonymous_id)">解除</button>
            </li>
          </ul>
        </div>

        <div class="binding-section">
          <h4>添加绑定</h4>
          <div class="add-binding-form">
            <select v-model="selectedChildId" class="child-select">
              <option value="">请选择学生</option>
              <option v-for="m in allMappings" :key="m.anonymous_id" :value="m.anonymous_id">
                {{ m.student_name }} ({{ m.anonymous_id }}) - {{ m.class_name || '未分班' }}
              </option>
            </select>
            <button class="btn-bind" @click="bindChild" :disabled="!selectedChildId">绑定</button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" @click="closeBindingModal">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsers, createUser, updateUser, deleteUser as delUser } from '@/api/admin'
import request from '@/api/request'

const users = ref([])
const roleFilter = ref('')
const showModal = ref(false)
const isEdit = ref(false)
const loading = ref(false)
const form = ref({
  username: '',
  password: '',
  role: 'teacher',
  id: null
})

const showBindingModal = ref(false)
const currentParent = ref(null)
const bindings = ref([])
const allMappings = ref([])
const selectedChildId = ref('')

const roles = [
  { value: '', label: '全部' },
  { value: 'admin', label: '管理员' },
  { value: 'teacher', label: '教师' },
  { value: 'parent', label: '家长' }
]

onMounted(() => {
  fetchUsers()
  fetchAllMappings()
})

async function fetchUsers() {
  const res = await getUsers(roleFilter.value || null)
  users.value = res.data
}

async function fetchAllMappings() {
  const res = await request.get('/attend/mapping')
  allMappings.value = res.data || []
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function getRoleLabel(role) {
  const labels = { admin: '管理员', teacher: '教师', parent: '家长' }
  return labels[role] || role
}

function openCreateModal() {
  isEdit.value = false
  form.value = { username: '', password: '', role: 'teacher', id: null }
  showModal.value = true
}

function openEditModal(user) {
  isEdit.value = true
  form.value = { id: user.id, username: user.username, role: user.role, password: '' }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function submitForm() {
  loading.value = true
  try {
    if (isEdit.value) {
      await updateUser(form.value.id, { role: form.value.role })
    } else {
      await createUser({
        username: form.value.username,
        password: form.value.password,
        role: form.value.role
      })
    }
    closeModal()
    fetchUsers()
  } catch (e) {
    alert(e.message || '操作失败')
  } finally {
    loading.value = false
  }
}

async function deleteUser(id) {
  if (!confirm('确定删除该用户吗？')) return
  try {
    await delUser(id)
    fetchUsers()
  } catch (e) {
    alert(e.message)
  }
}

async function openBindingModal(user) {
  currentParent.value = user
  showBindingModal.value = true
  await fetchBindings(user.username)
}

async function fetchBindings(username) {
  try {
    const res = await request.get(`/admin/parent-bindings/${username}`)
    bindings.value = res.data || []
  } catch (e) {
    console.error(e)
  }
}

async function bindChild() {
  if (!selectedChildId.value) return
  try {
    await request.post('/admin/parent-bindings', {
      parent_username: currentParent.value.username,
      child_anonymous_id: selectedChildId.value
    })
    selectedChildId.value = ''
    fetchBindings(currentParent.value.username)
  } catch (e) {
    alert('绑定失败')
  }
}

async function unbindChild(childId) {
  if (!confirm('确定解除绑定吗？')) return
  try {
    await request.delete('/admin/parent-bindings', {
      data: {
        parent_username: currentParent.value.username,
        child_anonymous_id: childId
      }
    })
    fetchBindings(currentParent.value.username)
  } catch (e) {
    alert('解除失败')
  }
}

function closeBindingModal() {
  showBindingModal.value = false
  currentParent.value = null
  bindings.value = []
  selectedChildId.value = ''
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #E5E6EB;
  border-radius: 20px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #0066CC;
  color: #0066CC;
}

.filter-btn.active {
  background: #0066CC;
  border-color: #0066CC;
  color: white;
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

.user-id {
  font-family: monospace;
  color: #86909C;
}

.username {
  font-weight: 500;
  color: #1D2129;
}

.time {
  color: #86909C;
  font-size: 13px;
}

.role-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.role-tag.admin {
  background: #F3E8FF;
  color: #722ED1;
}

.role-tag.teacher {
  background: #E6F4FF;
  color: #0066CC;
}

.role-tag.parent {
  background: #FFF7E6;
  color: #FA8C16;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-link:hover {
  background: #F5F7FA;
}

.btn-link.edit {
  color: #0066CC;
}

.btn-link.delete {
  color: #F56C6C;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #F5F7FA;
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
}

.role-select {
  display: flex;
  gap: 12px;
}

.radio-label {
  cursor: pointer;
}

.radio-label input {
  display: none;
}

.role-box {
  display: inline-block;
  padding: 8px 16px;
  border: 2px solid #E5E6EB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.radio-label input:checked + .role-box.admin {
  border-color: #722ED1;
  background: #F3E8FF;
  color: #722ED1;
}

.radio-label input:checked + .role-box.teacher {
  border-color: #0066CC;
  background: #E6F4FF;
  color: #0066CC;
}

.radio-label input:checked + .role-box.parent {
  border-color: #FA8C16;
  background: #FFF7E6;
  color: #FA8C16;
}

.binding-modal {
  width: 500px;
}

.binding-section {
  margin-bottom: 24px;
}

.binding-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin: 0 0 12px 0;
}

.empty-hint {
  color: #909399;
  font-size: 14px;
  padding: 12px 0;
}

.binding-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.binding-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #F0F2F5;
}

.binding-list li:last-child {
  border-bottom: none;
}

.child-info {
  font-size: 14px;
  color: #1D2129;
}

.btn-unbind {
  padding: 4px 12px;
  background: #FFF2F0;
  border: 1px solid #FFCCC7;
  color: #F56C6C;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-unbind:hover {
  background: #FF4D4F;
  color: white;
  border-color: #FF4D4F;
}

.add-binding-form {
  display: flex;
  gap: 12px;
}

.child-select {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #E5E6EB;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
}

.btn-bind {
  padding: 10px 20px;
  background: #0066CC;
  border: none;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-bind:hover:not(:disabled) {
  background: #0052AA;
}

.btn-bind:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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