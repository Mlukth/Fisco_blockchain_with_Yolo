import api from '../index'

export interface LoginParams {
  username: string
  password: string
}

export interface UserInfo {
  id: number
  username: string
  role: 'admin' | 'teacher' | 'parent'
  name: string
  classroom_id?: string
  phone?: string
}

export interface LoginResponse {
  success: boolean
  token: string
  user: UserInfo
}

export const authApi = {
  /**
   * 用户登录
   */
  login: (params: LoginParams): Promise<LoginResponse> => {
    return api.post('/auth/login', params)
  },

  /**
   * 刷新 Token
   */
  refreshToken: (): Promise<{ success: boolean; token: string }> => {
    return api.post('/auth/refresh-token')
  },

  /**
   * 获取当前用户信息
   */
  getProfile: (): Promise<{ success: boolean; profile: UserInfo }> => {
    return api.get('/auth/profile')
  },

  /**
   * 用户登出
   */
  logout: (): Promise<{ success: boolean; message: string }> => {
    return api.post('/auth/logout')
  }
}