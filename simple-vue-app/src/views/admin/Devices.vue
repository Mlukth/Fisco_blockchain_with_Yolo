<template>
  <div class="container">
    <h2>设备管理</h2>
    <button @click="showAdd = true" class="btn btn-primary">新增设备</button>
    <table class="data-table">
      <thead><tr><th>ID</th><th>名称</th><th>状态</th><th>IP</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="d in devices" :key="d.device_id">
          <td>{{ d.device_id }}</td><td>{{ d.device_name }}</td><td>{{ d.status }}</td><td>{{ d.ip_address }}</td>
          <td><button @click="editDevice(d)">编辑</button><button @click="deleteDevice(d.device_id)">删除</button></td>
        </tr>
      </tbody>
    </table>
    <!-- 模态框省略，保持精简，此处仅示意 -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDevices, createDevice, updateDevice, deleteDevice as delDevice } from '@/api/admin'

const devices = ref([])
onMounted(async () => { devices.value = (await getDevices()).data })
// 简化的增删改逻辑，可根据需要扩展
</script>