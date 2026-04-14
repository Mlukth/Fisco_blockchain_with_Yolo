<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <router-view />
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; }

/* 通用布局样式 */
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 220px; background: #001529; color: white; padding: 20px 0; }
.sidebar-header { padding: 0 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 16px; font-weight: bold; }
.sidebar a { display: block; padding: 12px 20px; color: rgba(255,255,255,0.7); text-decoration: none; }
.sidebar a:hover, .sidebar a.active { color: white; background: #1890ff; }
.main { flex: 1; display: flex; flex-direction: column; }
.header { height: 56px; background: white; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.content { flex: 1; padding: 20px; }

/* 卡片 */
.card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 20px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-weight: 500; }
.card-body { padding: 20px; }

/* 统计卡片 */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-card .value { font-size: 28px; font-weight: bold; color: #333; }
.stat-card .label { font-size: 14px; color: #999; margin-top: 4px; }

/* 表格 */
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; }
th { background: #fafafa; font-weight: 500; color: #666; }

/* 按钮 */
.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-primary { background: #1890ff; color: white; }
.btn-primary:hover { background: #40a9ff; }
.btn-danger { background: #ff4d4f; color: white; }
.btn-default { background: white; border: 1px solid #d9d9d9; color: #666; }

/* 表单 */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; }
.form-group input:focus { border-color: #1890ff; outline: none; }

/* 标签 */
.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag-green { background: #f6ffed; color: #52c41a; }
.tag-red { background: #fff2f0; color: #ff4d4f; }
.tag-orange { background: #fffbe6; color: #faad14; }
.tag-blue { background: #e6f7ff; color: #1890ff; }

/* 状态点 */
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.online { background: #52c41a; }
.status-dot.offline { background: #8c8c8c; }
.status-dot.error { background: #ff4d4f; }

@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .sidebar { display: none; }
}
</style>
