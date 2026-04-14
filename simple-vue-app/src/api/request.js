import axios from 'axios'

// 注意：使用相对路径 '/api'，让 Vite 代理转发到后端
const service = axios.create({
  baseURL: '/api',   // 开发环境通过代理，生产环境可配合 nginx
  timeout: 10000
})

service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

service.interceptors.response.use(
  response => {
    const res = response.data
    if (res.success !== undefined && !res.success) {
      return Promise.reject(new Error(res.error || '请求失败'))
    }
    return res
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default service