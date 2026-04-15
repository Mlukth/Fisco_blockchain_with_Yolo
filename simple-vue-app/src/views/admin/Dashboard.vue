<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
      <span class="page-date">{{ currentDate }}</span>
    </div>

    <!-- 警告横幅 -->
    <div v-if="warning" class="alert-banner">
      <span class="alert-icon">⚠️</span>
      <span class="alert-text">系统检测到部分考勤数据与存证记录不一致，请关注数据完整性。</span>
    </div>

    <!-- 告警聚合卡片 -->
    <div class="alert-cards">
      <div class="alert-card" @click="$router.push('/admin/users')">
        <div class="alert-icon-wrapper warning">
          <span class="alert-big-icon">⚠️</span>
        </div>
        <div class="alert-info">
          <div class="alert-value">{{ alertSummary?.attendanceAlerts || 0 }}</div>
          <div class="alert-label">条</div>
        </div>
        <div class="alert-desc">考勤异常待处理</div>
      </div>
      <div class="alert-card" @click="$router.push('/admin/devices')">
        <div class="alert-icon-wrapper offline">
          <span class="alert-big-icon">📡</span>
        </div>
        <div class="alert-info">
          <div class="alert-value">{{ alertSummary?.deviceAlerts || 0 }}</div>
          <div class="alert-label">台</div>
        </div>
        <div class="alert-desc">离线设备</div>
      </div>
    </div>

    <!-- 统计卡片组 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👨‍🎓</div>
        <div class="stat-value">{{ stats.totalStudents || 0 }}</div>
        <div class="stat-label">学生总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍🏫</div>
        <div class="stat-value">{{ stats.totalTeachers || 0 }}</div>
        <div class="stat-label">教师数</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍👩‍👧</div>
        <div class="stat-value">{{ stats.totalParents || 0 }}</div>
        <div class="stat-label">家长数</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-icon">📈</div>
        <div class="stat-value primary">{{ stats.todayAttendanceRate || 0 }}%</div>
        <div class="stat-label">今日出勤率</div>
      </div>
      <!-- 新增：链上存证总数卡片 -->
      <div class="stat-card chain">
        <div class="stat-icon">🔗</div>
        <div class="stat-value chain-value">{{ chainStats.totalMerkleRoots ?? '...' }}</div>
        <div class="stat-label">链上存证总数</div>
      </div>
    </div>

    <!-- 高级维护卡片 -->
    <div class="maintenance-card">
      <div class="maintenance-info">
        <h3 class="maintenance-title">🔒 高级维护</h3>
        <p class="maintenance-desc">强制验证存证一致性，确保所有考勤记录与区块链存证匹配</p>
      </div>
      <button class="btn-verify" @click="runVerify" :disabled="verifying">
        <span v-if="!verifying">⚡</span>
        <span v-else class="spinner"></span>
        {{ verifying ? '验证中...' : '强制验证存证一致性' }}
      </button>
    </div>

    <!-- 验证结果 -->
    <div v-if="verifyMsg" class="verify-result" :class="{ error: verifyMsg.includes('失败') }">
      <span class="result-icon">{{ verifyMsg.includes('失败') ? '❌' : '✅' }}</span>
      <span class="result-text">{{ verifyMsg }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { getStats, verifyAll } from '@/api/admin'
import request from '@/api/request'

const stats = ref({})
const warning = ref(false)
const verifyMsg = ref('')
const verifying = ref(false)
const alertSummary = ref(null)
const chainStats = ref({ totalMerkleRoots: 0 })
const showMessage = inject('showMessage')

const currentDate = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
})

onMounted(async () => {
  await fetchStats()
  await fetchAlertSummary()
  await fetchChainStats()
})

async function fetchStats() {
  const res = await getStats()
  stats.value = res.data
  warning.value = res.data.dataConsistencyWarning || false
}

async function fetchAlertSummary() {
  try {
    const res = await request.get('/admin/alert-summary')
    alertSummary.value = res.data
  } catch (e) {
    console.error('获取告警摘要失败', e)
  }
}

async function fetchChainStats() {
  try {
    const res = await request.get('/admin/chain-stats')
    chainStats.value = res.data
  } catch (e) {
    console.error('获取链上统计失败', e)
    chainStats.value = { totalMerkleRoots: '?' }
  }
}

async function runVerify() {
  verifying.value = true
  verifyMsg.value = ''
  try {
    const res = await verifyAll()
    verifyMsg.value = `验证完成：检查 ${res.data.totalRecords} 条记录，异常批次 ${res.data.mismatchBatches}`
    showMessage('数据完整性检测完成', res.data.mismatchBatches ? 'warning' : 'success')
    fetchStats()
  } catch (e) {
    verifyMsg.value = '验证失败'
    showMessage('验证失败，请稍后重试', 'error')
  } finally {
    verifying.value = false
  }
}
</script>

<style scoped>
/* 页面标题 */
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

.page-date {
  font-size: 14px;
  color: #86909C;
}

/* 警告横幅 */
.alert-banner {
  background: #FFFBE6;
  border-left: 4px solid #FAAD14;
  padding: 14px 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-icon {
  font-size: 20px;
}

.alert-text {
  font-size: 14px;
  color: #874100;
}

/* 告警聚合卡片 */
.alert-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.alert-card {
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 4px solid #E6A23C;
}

.alert-card:last-child {
  border-left-color: #909399;
}

.alert-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.alert-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-icon-wrapper.warning {
  background: #FFF7E6;
}

.alert-icon-wrapper.offline {
  background: #F4F4F5;
}

.alert-big-icon {
  font-size: 28px;
}

.alert-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.alert-value {
  font-size: 32px;
  font-weight: 700;
  color: #1D2129;
}

.alert-label {
  font-size: 16px;
  color: #86909C;
}

.alert-desc {
  margin-left: auto;
  font-size: 14px;
  color: #4E5969;
}

/* 统计卡片组 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: all 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.stat-card.highlight {
  background: linear-gradient(135deg, #E6F4FF 0%, #BAE0FF 100%);
}

.stat-card.chain {
  background: linear-gradient(135deg, #E6F4FF 0%, #BAE0FF 100%);
}

.stat-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1D2129;
  margin-bottom: 4px;
}

.stat-value.primary {
  color: #0066CC;
}

.stat-value.chain-value {
  color: #0066CC;
}

.stat-label {
  font-size: 14px;
  color: #86909C;
}

/* 高级维护卡片 */
.maintenance-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.maintenance-title {
  font-size: 16px;
  font-weight: 600;
  color: #1D2129;
  margin: 0 0 8px 0;
}

.maintenance-desc {
  font-size: 14px;
  color: #86909C;
  margin: 0;
}

.btn-verify {
  padding: 12px 24px;
  background: #0066CC;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-verify:hover:not(:disabled) {
  background: #0052AA;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.btn-verify:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 验证结果 */
.verify-result {
  background: #F6FFED;
  border-left: 4px solid #52C41A;
  padding: 14px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.verify-result.error {
  background: #FFF2F0;
  border-left-color: #FF4D4F;
}

.result-icon {
  font-size: 20px;
}

.result-text {
  font-size: 14px;
  color: #389E0D;
}

.verify-result.error .result-text {
  color: #CF1322;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .alert-cards {
    grid-template-columns: 1fr;
  }
  
  .maintenance-card {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>