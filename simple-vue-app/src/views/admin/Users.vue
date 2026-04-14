<template>
  <div class="container">
    <div class="page-header">
      <h2>用户管理</h2>
      <button class="btn btn-primary" @click="openCreateModal">+ 新增用户</button>
    </div>

    <div class="filter-bar">
      <select v-model="roleFilter" @change="fetchUsers">
        <option value="">全部角色</option>
        <option value="admin">管理员</option>
        <option value="teacher">教师</option>
        <option value="parent">家长</option>
      </select>
    </div>

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
          <td>{{ user.id }}</td>
          <td>{{ user.username }}</td>
          <td><span class="role-tag" :class="user.role">{{ user.role }}</span></td>
          <td>{{ formatDate(user.created_at) }}</td>
          <td>
            <button class="btn-icon" @click="openEditModal(user)">✏️</button>
            <button class="btn-icon" @click="deleteUser(user.id)">🗑️</button>
            <button v-if="user.role === 'parent'" class="btn-icon" @click="openBindingModal(user)">🔗</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 新增/编辑模态框（原有） -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <!-- ... 保持不变 ... -->
    </div>

    <!-- 家长绑定模态框（新增） -->
    <div v-if="showBindingModal" class="modal-overlay" @click.self="closeBindingModal">
      <div class="modal">
        <h3>管理绑定 - {{ currentParent?.username }}</h3>
        <div class="binding-section">
          <h4>已绑定孩子</h4>
          <ul v-if="bindings.length">
            <li v-for="b in bindings" :key="b.anonymous_id">
              {{ b.student_name }} ({{ b.anonymous_id }}) - {{ b.class_name || '未分班' }}
              <button class="btn-icon" @click="unbindChild(b.anonymous_id)">解除</button>
            </li>
          </ul>
          <p v-else>暂无绑定</p>
        </div>
        <div class="binding-section">
          <h4>添加绑定</h4>
          <select v-model="selectedChildId">
            <option value="">请选择学生</option>
            <option v-for="m in allMappings" :key="m.anonymous_id" :value="m.anonymous_id">
              {{ m.student_name }} ({{ m.anonymous_id }}) - {{ m.class_name || '未分班' }}
            </option>
          </select>
          <button class="btn btn-primary" @click="bindChild" :disabled="!selectedChildId">绑定</button>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="closeBindingModal">关闭</button>
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
const form = ref({ username: '', password: '', role: 'teacher', id: null })

// 绑定相关
const showBindingModal = ref(false)
const currentParent = ref(null)
const bindings = ref([])
const allMappings = ref([])
const selectedChildId = ref('')

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
      await createUser({ username: form.value.username, password: form.value.password, role: form.value.role })
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

// 绑定管理
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
      data: { parent_username: currentParent.value.username, child_anonymous_id: childId }
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
/* 原有样式 + 新增 */
.binding-section {
  margin-bottom: 20px;
}
.binding-section h4 {
  margin-bottom: 10px;
}
.binding-section ul {
  list-style: none;
  padding: 0;
}
.binding-section li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 10px;
  font-size: 16px;
}
</style>