import axios from 'axios'
import type { AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://192.168.171.157:3002/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data && data.success === false) {
      return Promise.reject(new Error(data.error || '请求失败'))
    }
    return data
  },
  (error) => {
    if (error.response?.status === 401) {
      // 防止重复跳转：仅在非登录页且 token 存在时清理并跳转
      const isLoginPage = window.location.pathname === '/login'
      if (!isLoginPage) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        console.warn('⚠️ 401 未授权，跳转登录页')
        window.location.href = '/login'
      }
    }
    const message = error.response?.data?.error || error.message || '网络错误'
    return Promise.reject(new Error(message))
  }
)

export default api
