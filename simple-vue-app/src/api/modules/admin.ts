import api from '../index'

// 统计数据类型
export interface AdminStats {
  totalStudents: number
  totalTeachers: number
  totalParents: number
  totalDevices: number
  onlineDevices: number
  todayAttendanceRate: number
  todayTotal: number
}

// 用户类型
export interface AdminUser {
  id: number
  username: string
  role: string
  name: string
  phone?: string
  classroom_id?: string
  created_at: string
}

// 异常类型（保留用于仪表盘异常提醒）
export interface AdminException {
  type: 'attendance' | 'device'
  [key: string]: any
}

export const adminApi = {
  // ========== 仪表盘统计 ==========
  getStats: (): Promise<{ success: boolean; data: AdminStats }> => {
    return api.get('/admin/stats')
  },

  // ========== 用户管理 ==========
  getUsers: (role?: string): Promise<{ success: boolean; data: AdminUser[] }> => {
    return api.get('/admin/users', { params: { role } })
  },
  createUser: (data: Partial<AdminUser> & { password?: string }): Promise<{ success: boolean; data: { id: number } }> => {
    return api.post('/admin/users', data)
  },
  updateUser: (id: number, data: Partial<AdminUser>): Promise<{ success: boolean; changes: number }> => {
    return api.put(`/admin/users/${id}`, data)
  },
  deleteUser: (id: number): Promise<{ success: boolean; changes: number }> => {
    return api.delete(`/admin/users/${id}`)
  },

  // ========== 异常提醒（保留，用于仪表盘） ==========
  getExceptions: (): Promise<{ success: boolean; data: { attendance: any[]; devices: any[] } }> => {
    return api.get('/admin/exceptions')
  }
}