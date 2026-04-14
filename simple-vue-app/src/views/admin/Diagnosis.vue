<template>
  <div class="diagnosis-page">
    <div class="page-header">
      <h1 class="page-title">系统诊断</h1>
    </div>
    <div class="placeholder">
      <span class="placeholder-icon">🔧</span>
      <span class="placeholder-text">诊断功能暂未开放。</span>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1D2129;
  margin: 0;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  gap: 16px;
}

.placeholder-icon {
  font-size: 48px;
}

.placeholder-text {
  font-size: 16px;
  color: #86909C;
}
</style>