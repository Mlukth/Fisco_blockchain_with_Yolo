<script setup lang="ts">
import { ref } from 'vue'

const uploading = ref(false)
const uploadedRecords = ref<any[]>([])

const form = ref({
  anonymousId: '',
  status: 'present',
  classroom: '一年级1班',
  deviceId: 'DEV001'
})

function submitAttendance() {
  if (!form.value.anonymousId) {
    alert('请输入匿名ID')
    return
  }
  
  uploading.value = true
  setTimeout(() => {
    uploadedRecords.value.unshift({
      ...form.value,
      time: new Date().toLocaleTimeString('zh-CN'),
      date: new Date().toLocaleDateString('zh-CN')
    })
    form.value.anonymousId = ''
    uploading.value = false
    alert('考勤数据上报成功！')
  }, 1000)
}

const recentRecords = ref([
  { anonymousId: 'A1B2C3D4', status: 'present', time: '07:55:23', classroom: '一年级1班' },
  { anonymousId: 'E5F6G7H8', status: 'present', time: '07:56:10', classroom: '一年级1班' },
  { anonymousId: 'I9J0K1L2', status: 'late', time: '08:05:12', classroom: '一年级1班' },
])
</script>

<template>
  <div class="layout">
    <aside class="sidebar" style="background: #1890ff">
      <div class="sidebar-header">📤 考勤采集</div>
      <nav>
        <router-link to="/upload"><div class="active">手动上报</div></router-link>
        <router-link to="/teacher/class"><div>查看记录</div></router-link>
      </nav>
    </aside>
    <div class="main">
      <header class="header">
        <span>智慧课堂考勤系统 - 考勤采集</span>
      </header>
      <main class="content">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
          <!-- 上报表单 -->
          <div class="card">
            <div class="card-header">📝 考勤数据上报</div>
            <div class="card-body">
              <div class="form-group">
                <label>匿名ID</label>
                <input v-model="form.anonymousId" placeholder="人脸识别生成的8位ID" />
              </div>
              <div class="form-group">
                <label>考勤状态</label>
                <select v-model="form.status">
                  <option value="present">出勤</option>
                  <option value="late">迟到</option>
                  <option value="absent">缺勤</option>
                  <option value="leave">请假</option>
                </select>
              </div>
              <div class="form-group">
                <label>教室</label>
                <input v-model="form.classroom" />
              </div>
              <div class="form-group">
                <label>设备ID</label>
                <input v-model="form.deviceId" />
              </div>
              <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 16px" @click="submitAttendance" :disabled="uploading">
                {{ uploading ? '上报中...' : '📤 提交考勤' }}
              </button>
            </div>
          </div>
          
          <!-- 最近记录 -->
          <div class="card">
            <div class="card-header">📋 最近上报记录</div>
            <div class="card-body">
              <div v-for="r in [...uploadedRecords, ...recentRecords].slice(0, 5)" :key="r.time" style="display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f0f0f0">
                <div>
                  <code style="background: #f5f5f5; padding: 2px 8px; border-radius: 4px">{{ r.anonymousId }}</code>
                  <span :class="'tag tag-' + (r.status === 'present' ? 'green' : r.status === 'late' ? 'orange' : 'red')" style="margin-left: 8px">
                    {{ r.status === 'present' ? '出勤' : r.status === 'late' ? '迟到' : r.status }}
                  </span>
                </div>
                <div style="color: #999; font-size: 13px">{{ r.time }}</div>
              </div>
              <div v-if="uploadedRecords.length === 0 && recentRecords.length === 0" style="text-align: center; color: #999; padding: 40px">
                暂无上报记录
              </div>
            </div>
          </div>
        </div>
        
        <!-- 提示 -->
        <div class="card" style="margin-top: 20px">
          <div class="card-body" style="background: #e6f7ff; border-radius: 8px">
            <div style="display: flex; align-items: center; gap: 12px">
              <span style="font-size: 24px">💡</span>
              <div>
                <div style="font-weight: 500; margin-bottom: 4px">操作提示</div>
                <div style="color: #666; font-size: 14px">此页面用于手动录入考勤数据。实际部署时，边缘设备会自动通过 API 上报考勤记录，无需人工干预。</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
