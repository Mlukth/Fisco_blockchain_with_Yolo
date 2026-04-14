<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/modules/auth'

const router = useRouter()
const auth = useAuthStore()

const form = ref({
  username: '',
  password: '',
  role: 'teacher' as 'admin' | 'teacher' | 'parent'
})
const error = ref('')
const loading = ref(false)

const roles = [
  { value: 'admin', label: '管理员', icon: '👨‍💼' },
  { value: 'teacher', label: '教师', icon: '👨‍🏫' },
  { value: 'parent', label: '家长', icon: '👨‍👩‍👧' }
]

// 根据角色预设演示账号
function setDemoAccount(role: 'admin' | 'teacher' | 'parent') {
  form.role = role
  form.username = role
  // 演示密码统一为 password123
}

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    const response = await authApi.login({
      username: form.value.username,
      password: form.value.password
    })

    // 存储 token 和用户信息
    auth.login(response.token, response.user)

    // 根据角色跳转
    const routes: Record<string, string> = {
      admin: '/admin',
      teacher: '/teacher',
      parent: '/parent'
    }
    router.push(routes[response.user.role] || '/')
  } catch (err: any) {
    error.value = err.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}

// 快速填充演示账号（可选，方便测试）
function fillDemo(role: 'admin' | 'teacher' | 'parent') {
  setDemoAccount(role)
  form.value.password = 'password123'
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; background: linear-gradient(135deg, #667eea, #764ba2)">
    <!-- 左侧品牌区域（保持不变） -->
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; padding: 40px">
      <div style="font-size: 60px; margin-bottom: 20px">📚</div>
      <h1 style="font-size: 32px; margin-bottom: 12px">智慧课堂考勤系统</h1>
      <p style="font-size: 16px; opacity: 0.9; margin-bottom: 40px">基于 YOLO 深度视觉与区块链隐私保护</p>
      <div style="display: flex; gap: 20px">
        <div style="background: rgba(255,255,255,0.1); padding: 16px 24px; border-radius: 12px">
          <div style="font-size: 24px; margin-bottom: 8px">🔒</div>
          <div style="font-size: 14px">隐私保护</div>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 16px 24px; border-radius: 12px">
          <div style="font-size: 24px; margin-bottom: 8px">⛓️</div>
          <div style="font-size: 14px">可信存证</div>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 16px 24px; border-radius: 12px">
          <div style="font-size: 24px; margin-bottom: 8px">✅</div>
          <div style="font-size: 14px">一键验真</div>
        </div>
      </div>
      <!-- 演示账号快捷入口 -->
      <div style="margin-top: 30px; display: flex; gap: 12px">
        <button
          v-for="r in roles"
          :key="r.value"
          @click="fillDemo(r.value)"
          style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 6px 16px; border-radius: 20px; cursor: pointer; font-size: 13px"
        >
          {{ r.icon }} {{ r.label }}演示
        </button>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div style="width: 420px; background: white; padding: 60px 40px; display: flex; flex-direction: column; justify-content: center">
      <h2 style="font-size: 24px; margin-bottom: 8px">欢迎登录</h2>
      <p style="color: #999; margin-bottom: 32px">请选择您的角色并输入账号信息</p>

      <!-- 角色选择 -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px">
        <div
          v-for="r in roles"
          :key="r.value"
          @click="setDemoAccount(r.value)"
          :style="{
            flex: 1,
            padding: '16px',
            border: '2px solid',
            borderColor: form.role === r.value ? '#667eea' : '#e8e8e8',
            borderRadius: '12px',
            cursor: 'pointer',
            textAlign: 'center',
            background: form.role === r.value ? 'rgba(102,126,234,0.1)' : 'white'
          }"
        >
          <div style="font-size: 24px">{{ r.icon }}</div>
          <div style="font-size: 14px; margin-top: 8px">{{ r.label }}</div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="error"
        style="background: #fff2f0; border: 1px solid #ffccc7; padding: 12px; border-radius: 8px; color: #ff4d4f; margin-bottom: 16px"
      >
        ❌ {{ error }}
      </div>

      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" placeholder="请输入用户名" :disabled="loading" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" :disabled="loading" />
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
            <input type="checkbox" checked /> 记住我
          </label>
          <a href="#" style="color: #667eea; text-decoration: none">忘记密码？</a>
        </div>
        <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 16px" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <div style="text-align: center; margin-top: 24px; color: #999; font-size: 13px">
        登录即表示同意 <a href="#" style="color: #667eea">用户协议</a> 和
        <a href="#" style="color: #667eea">隐私政策</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}
.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}
.form-group input:focus {
  outline: none;
  border-color: #667eea;
}
.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  color: white;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.3s;
}
.btn-primary:hover {
  opacity: 0.9;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>