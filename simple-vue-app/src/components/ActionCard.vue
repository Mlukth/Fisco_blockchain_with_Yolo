<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
  color: string
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div
    class="action-card"
    :style="{ borderTop: `4px solid ${color}` }"
    @click="emit('click')"
  >
    <div class="icon" :style="{ background: color + '20', color: color }">
      {{ icon }}
    </div>
    <div class="content">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.action-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.content h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}
.content p {
  margin: 0;
  color: #999;
  font-size: 14px;
}
</style>
