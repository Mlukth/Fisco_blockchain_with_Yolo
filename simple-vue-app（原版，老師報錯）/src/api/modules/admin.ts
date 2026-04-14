import api from '../index'

// 统计数据类型
export interface AdminStats {
  totalStudents: number
  totalTeachers: number
  totalParents: number
  totalDevices: number      // 后端暂未提供，前端默认 0
  onlineDevices: number     // 后端暂未提供，前端默认 0
  todayAttendanceRate: number
  todayTotal: number
}

// 用户类型
export interface AdminUser {
  id: number
  username: string
  role: string
  name?: string
  phone?: string
  classroom_id?: string
  created_at: string
}

export const adminApi = {
  // 获取统计信息
  getStats: (): Promise<{ success: boolean; data: AdminStats }> => {
    return api.get('/admin/stats')
  },

  // 获取用户列表
  getUsers: (role?: string): Promise<{ success: boolean; data: AdminUser[] }> => {
    return api.get('/admin/users', { params: { role } })
  },

  // 创建用户
  createUser: (data: Partial<AdminUser> & { password?: string }): Promise<{ success: boolean; data: { id: number } }> => {
    return api.post('/admin/users', data)
  },

  // 更新用户
  updateUser: (id: number, data: Partial<AdminUser>): Promise<{ success: boolean; changes: number }> => {
    return api.put(`/admin/users/${id}`, data)
  },

  // 删除用户
  deleteUser: (id: number): Promise<{ success: boolean; changes: number }> => {
    return api.delete(`/admin/users/${id}`)
  },

  // 获取异常提醒
  getExceptions: (): Promise<{ success: boolean; data: { attendance: any[]; devices: any[] } }> => {
    return api.get('/admin/exceptions')
  }
}