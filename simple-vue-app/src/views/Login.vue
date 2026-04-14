<template>
  <div class="login-container">
    <div class="login-card">
      <h2>智慧课堂考勤系统</h2>
      <form @submit.prevent="handleLogin">
        <input v-model="username" type="text" placeholder="用户名" required />
        <input v-model="password" type="password" placeholder="密码" required />
        <button type="submit" class="btn btn-primary">登录</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const error = ref('')
const authStore = useAuthStore()
const router = useRouter()

async function handleLogin() {
  try {
    error.value = ''
    await authStore.login(username.value, password.value)
    const role = authStore.user.role
    if (role === 'admin') router.push('/admin')
    else if (role === 'teacher') router.push('/teacher')
    else if (role === 'parent') router.push('/parent')
  } catch (e) {
    error.value = e.message || '登录失败'
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}
h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}
input {
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}
.btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
}
.error {
  color: #f56c6c;
  margin-top: 10px;
  text-align: center;
}
</style>