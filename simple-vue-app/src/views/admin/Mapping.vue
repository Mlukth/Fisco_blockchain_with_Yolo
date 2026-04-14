<template>
  <div class="container">
    <h2>匿名映射管理</h2>
    <p class="hint">数据由边缘端同步，仅供查看，不支持在线增删改。</p>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else>
      <table class="mapping-table">
        <thead>
          <tr>
            <th>匿名ID</th>
            <th>学生姓名</th>
            <th>年级</th>
            <th>班级</th>
            <th>家长手机号</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in mappings" :key="item.anonymous_id">
            <td>{{ item.anonymous_id }}</td>
            <td>{{ item.student_name }}</td>
            <td>{{ item.grade || '-' }}</td>
            <td>{{ item.class_name || '-' }}</td>
            <td>{{ item.parent_phone || '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="mappings.length === 0" class="empty">暂无映射数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/api/request'

const mappings = ref([])
const loading = ref(true)

async function fetchMappings() {
  try {
    const res = await request.get('/attend/mapping')
    mappings.value = res.data || []
  } catch (e) {
    console.error('获取映射列表失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchMappings)
</script>

<style scoped>
.hint {
  color: #909399;
  margin-bottom: 20px;
}
.mapping-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.mapping-table th,
.mapping-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #ebeef5;
}
.mapping-table th {
  background: #f5f7fa;
  font-weight: 500;
  color: #606266;
}
.empty {
  text-align: center;
  padding: 40px;
  color: #909399;
}
.loading {
  text-align: center;
  padding: 40px;
}
</style>