<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { adminApi, type AdminUser } from '@/api/modules/admin'

const users = ref<AdminUser[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingUser = ref<AdminUser | null>(null)
const form = ref({
  username: '',
  name: '',
  role: 'teacher' as 'admin' | 'teacher' | 'parent',
  phone: '',
  classroom: '',
  password: ''
})

const roleFilter = ref('')
const searchKey = ref('')

const filteredUsers = computed(() => {
  let list = users.value
  if (roleFilter.value) list = list.filter(u => u.role === roleFilter.value)
  if (searchKey.value) list = list.filter(u => u.name.includes(searchKey.value) || u.username.includes(searchKey.value))
  return list
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await adminApi.getUsers()
    users.value = res.data
  } catch (err) {
    console.error('获取用户列表失败', err)
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  editingUser.value = null
  form.value = { username: '', name: '', role: 'teacher', phone: '', classroom: '', password: '' }
  showModal.value = true
}

const openEditModal = (user: AdminUser) => {
  editingUser.value = user
  form.value = {
    username: user.username,
    name: user.name,
    role: user.role as any,
    phone: user.phone || '',
    classroom: user.classroom_id || '',
    password: ''
  }
  showModal.value = true
}

const saveUser = async () => {
  try {
    if (editingUser.value) {
      await adminApi.updateUser(editingUser.value.id, {
        name: form.value.name,
        role: form.value.role,
        phone: form.value.phone,
        classroom_id: form.value.classroom
      })
    } else {
      await adminApi.createUser({
        username: form.value.username,
        name: form.value.name,
        role: form.value.role,
        phone: form.value.phone,
        classroom_id: form.value.classroom,
        password: form.value.password || undefined
      })
    }
    showModal.value = false
    fetchUsers()
  } catch (err: any) {
    alert('保存失败: ' + err.message)
  }
}

const deleteUser = async (user: AdminUser) => {
  if (user.role === 'admin') {
    alert('不能删除管理员账户')
    return
  }
  if (!confirm(`确定删除用户 ${user.name}？`)) return
  try {
    await adminApi.deleteUser(user.id)
    fetchUsers()
  } catch (err: any) {
    alert('删除失败: ' + err.message)
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px">
      <h1 style="font-size: 24px">用户管理</h1>
      <button class="btn btn-primary" @click="openAddModal">+ 新增用户</button>
    </div>

    <!-- 筛选 -->
    <div class="card" style="margin-bottom: 20px">
      <div class="card-body" style="display: flex; gap: 16px">
        <select v-model="roleFilter" style="padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px">
          <option value="">全部角色</option>
          <option value="admin">管理员</option>
          <option value="teacher">教师</option>
          <option value="parent">家长</option>
        </select>
        <input v-model="searchKey" placeholder="搜索用户名/姓名" style="flex: 1; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px" />
        <button class="btn btn-primary" @click="fetchUsers">刷新</button>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="card">
      <div v-if="loading" style="padding: 40px; text-align: center">加载中...</div>
      <table v-else>
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>姓名</th>
            <th>角色</th>
            <th>手机号</th>
            <th>班级</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filteredUsers" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.name }}</td>
            <td>
              <span :class="'tag tag-' + (u.role === 'admin' ? 'blue' : u.role === 'teacher' ? 'green' : 'orange')">
                {{ u.role === 'admin' ? '管理员' : u.role === 'teacher' ? '教师' : '家长' }}
              </span>
            </td>
            <td>{{ u.phone || '-' }}</td>
            <td>{{ u.classroom_id || '-' }}</td>
            <td>
              <button class="btn btn-default" @click="openEditModal(u)" style="margin-right: 8px">编辑</button>
              <button class="btn btn-danger" @click="deleteUser(u)" v-if="u.role !== 'admin'">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 弹窗 -->
    <div v-if="showModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000">
      <div style="background: white; padding: 24px; border-radius: 8px; width: 400px">
        <h3 style="margin-bottom: 20px">{{ editingUser ? '编辑用户' : '新增用户' }}</h3>
        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" :disabled="!!editingUser" />
        </div>
        <div class="form-group" v-if="!editingUser">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="留空则默认为 password123" />
        </div>
        <div class="form-group">
          <label>姓名</label>
          <input v-model="form.name" />
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="form.role">
            <option value="admin">管理员</option>
            <option value="teacher">教师</option>
            <option value="parent">家长</option>
          </select>
        </div>
        <div class="form-group" v-if="form.role === 'teacher'">
          <label>班级</label>
          <input v-model="form.classroom" />
        </div>
        <div class="form-group" v-if="form.role === 'parent'">
          <label>手机号</label>
          <input v-model="form.phone" />
        </div>
        <div style="display: flex; gap: 12px; margin-top: 24px">
          <button class="btn btn-default" style="flex: 1" @click="showModal = false">取消</button>
          <button class="btn btn-primary" style="flex: 1" @click="saveUser">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>