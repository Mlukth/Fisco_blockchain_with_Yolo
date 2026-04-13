<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { mappingApi, AnonymousMapping } from '@/api/modules/mapping'

const mappings = ref<AnonymousMapping[]>([])
const loading = ref(false)
const showForm = ref(false)
const editingItem = ref<AnonymousMapping | null>(null)
const form = ref<AnonymousMapping>({
  anonymous_id: '',
  student_name: '',
  grade: '',
  class_name: '',
  parent_phone: ''
})

const fetchMappings = async () => {
  loading.value = true
  try {
    const res = await mappingApi.getAll()
    if (res.success) mappings.value = res.data
  } finally {
    loading.value = false
  }
}

const saveMapping = async () => {
  try {
    if (editingItem.value) {
      await mappingApi.update(editingItem.value.anonymous_id, form.value)
    } else {
      await mappingApi.create(form.value)
    }
    showForm.value = false
    fetchMappings()
  } catch (err) {
    alert('保存失败')
  }
}

const editMapping = (item: AnonymousMapping) => {
  editingItem.value = item
  form.value = { ...item }
  showForm.value = true
}

const deleteMapping = async (id: string) => {
  if (!confirm('确定删除该映射吗？')) return
  await mappingApi.delete(id)
  fetchMappings()
}

const handleFileUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const res = await mappingApi.importCsv(file)
    alert(`成功导入 ${res.imported} 条记录`)
    fetchMappings()
  } catch (err) {
    alert('导入失败')
  }
}

onMounted(fetchMappings)
</script>

<template>
  <div>
    <h1 style="font-size: 24px; margin-bottom: 20px">匿名映射管理</h1>

    <div style="display: flex; gap: 16px; margin-bottom: 20px">
      <button class="btn btn-primary" @click="showForm = true; editingItem = null; form = { anonymous_id: '', student_name: '', grade: '', class_name: '', parent_phone: '' }">➕ 新增映射</button>
      <label class="btn btn-default">
        📂 导入CSV
        <input type="file" accept=".csv" @change="handleFileUpload" style="display: none" />
      </label>
    </div>

    <div class="card">
      <table v-if="mappings.length > 0">
        <thead>
          <tr>
            <th>匿名ID</th>
            <th>学生姓名</th>
            <th>年级</th>
            <th>班级</th>
            <th>家长电话</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in mappings" :key="m.anonymous_id">
            <td>{{ m.anonymous_id }}</td>
            <td>{{ m.student_name }}</td>
            <td>{{ m.grade || '--' }}</td>
            <td>{{ m.class_name || '--' }}</td>
            <td>{{ m.parent_phone || '--' }}</td>
            <td>
              <button class="btn-small" @click="editMapping(m)">编辑</button>
              <button class="btn-small btn-danger" @click="deleteMapping(m.anonymous_id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else>暂无映射数据</p>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showForm" class="modal">
      <div class="modal-content">
        <h2>{{ editingItem ? '编辑' : '新增' }}映射</h2>
        <div class="form-group">
          <label>匿名ID *</label>
          <input v-model="form.anonymous_id" :disabled="!!editingItem" />
        </div>
        <div class="form-group">
          <label>学生姓名 *</label>
          <input v-model="form.student_name" />
        </div>
        <div class="form-group">
          <label>年级</label>
          <input v-model="form.grade" />
        </div>
        <div class="form-group">
          <label>班级</label>
          <input v-model="form.class_name" />
        </div>
        <div class="form-group">
          <label>家长电话</label>
          <input v-model="form.parent_phone" />
        </div>
        <div style="display: flex; gap: 12px; margin-top: 20px">
          <button class="btn btn-primary" @click="saveMapping">保存</button>
          <button class="btn btn-default" @click="showForm = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
}
.btn-small {
  padding: 4px 8px;
  margin-right: 8px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}
.btn-danger {
  color: #ff4d4f;
  border-color: #ffccc7;
}
</style>