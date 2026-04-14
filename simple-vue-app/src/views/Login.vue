<template>
  <div class="login-container">
    <div class="login-wrapper">
      <div class="login-left">
        <div class="illustration">
          <div class="illustration-circle"></div>
          <div class="illustration-content">
            <div class="icon-wrapper">🎓</div>
            <div class="illustration-title">智慧课堂</div>
            <div class="illustration-subtitle">基于区块链的考勤存证系统</div>
            <div class="illustration-features">
              <div class="feature-item">
                <span class="feature-icon">🔐</span>
                <span>区块链存证</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">👁️</span>
                <span>人脸识别</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>实时监控</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="login-right">
        <div class="login-card">
          <div class="login-header">
            <div class="logo-badge">📚</div>
            <h1 class="login-title">欢迎回来</h1>
            <p class="login-subtitle">登录智慧课堂考勤系统</p>
          </div>
          
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <div class="input-wrapper">
                <span class="input-icon">👤</span>
                <input 
                  v-model="username" 
                  type="text" 
                  placeholder="请输入用户名" 
                  class="form-input"
                  autocomplete="username"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">密码</label>
              <div class="input-wrapper">
                <span class="input-icon">🔑</span>
                <input 
                  v-model="password" 
                  type="password" 
                  placeholder="请输入密码" 
                  class="form-input"
                  autocomplete="current-password"
                />
              </div>
            </div>
            
            <button type="submit" class="btn-login">
              <span v-if="!loading">登录</span>
              <span v-else class="loading-spinner"></span>
            </button>
          </form>
          
          <div class="login-footer">
            <div class="role-hint">
              <span class="role-dot"></span>
              <span>管理员 / 教师 / 家长</span>
            </div>
          </div>
          
          <div v-if="error" class="error-message">
            <span class="error-icon">⚠️</span>
            {{ error }}
          </div>
        </div>
      </div>
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
const loading = ref(false)

const authStore = useAuthStore()
const router = useRouter()

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.login(username.value, password.value)
    const role = authStore.user.role
    if (role === 'admin') router.push('/admin')
    else if (role === 'teacher') router.push('/teacher')
    else if (role === 'parent') router.push('/parent')
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
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
  padding: 20px;
}

.login-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  width: 100%;
  max-width: 1000px;
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2);
}

.login-left {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.illustration-circle {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  top: -100px;
  right: -100px;
  animation: float 6s ease-in-out infinite;
}

.illustration-circle::before {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  bottom: -50px;
  left: 50px;
  animation: float 4s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

.illustration-content {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  margin: 0 auto 30px;
}

.illustration-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
}

.illustration-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 40px;
}

.illustration-features {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.95;
}

.feature-icon {
  font-size: 24px;
}

.login-right {
  padding: 60px 50px;
  display: flex;
  align-items: center;
}

.login-card {
  width: 100%;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-badge {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 20px;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.login-title {
  font-size: 32px;
  font-weight: 700;
  color: #1D2129;
  margin: 0 0 8px 0;
}

.login-subtitle {
  font-size: 16px;
  color: #86909C;
  margin: 0;
}

.login-form {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1D2129;
  margin-bottom: 10px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  font-size: 18px;
  color: #86909C;
  z-index: 1;
}

.form-input {
  width: 100%;
  padding: 16px 16px 16px 52px;
  border: 2px solid #E5E6EB;
  border-radius: 12px;
  font-size: 15px;
  color: #1D2129;
  background: #F5F7FA;
  transition: all 0.3s;
}

.form-input::placeholder {
  color: #86909C;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.btn-login {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
}

.btn-login:active:not(:disabled) {
  transform: translateY(0);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.role-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #86909C;
}

.role-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #667eea;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  margin-top: 20px;
  background: #FFF2F0;
  border: 1px solid #FFCCC7;
  border-radius: 8px;
  color: #CF1322;
  font-size: 14px;
  font-weight: 500;
}

.error-icon {
  font-size: 16px;
}

@media (max-width: 900px) {
  .login-wrapper {
    grid-template-columns: 1fr;
    max-width: 500px;
  }

  .login-left {
    display: none;
  }

  .login-right {
    padding: 40px;
  }
}

@media (max-width: 480px) {
  .login-wrapper {
    border-radius: 0;
    box-shadow: none;
  }

  .login-right {
    padding: 30px 24px;
  }

  .login-card {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .login-header {
    flex: 0 0 auto;
  }

  .login-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}
</style>