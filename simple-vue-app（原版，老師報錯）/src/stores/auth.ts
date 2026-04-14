import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  function login(newToken: string, userInfo: any) {
    token.value = newToken
    // 后端返回的 user 对象包含 id, username, role, name
    user.value = userInfo
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userInfo))
    console.log('✅ 登录成功，角色:', userInfo.role)
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, login, logout }
})
