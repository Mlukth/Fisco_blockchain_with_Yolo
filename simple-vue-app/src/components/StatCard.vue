<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  icon: string
  color: string
}>()
</script>

<template>
  <div class="stat-card">
    <div style="display: flex; align-items: center">
      <div
        :style="{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: color + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          marginRight: '16px'
        }"
      >
        {{ icon }}
      </div>
      <div>
        <div class="value">{{ value }}</div>
        <div class="label">{{ title }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}
.label {
  color: #999;
  margin-top: 8px;
}
</style>
