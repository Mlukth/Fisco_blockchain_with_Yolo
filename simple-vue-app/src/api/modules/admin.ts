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

// 设备类型
export interface AdminDevice {
  device_id: string
  device_name: string
  classroom_id: string
  status: 'online' | 'offline' | 'error'
  ip_address?: string
  last_heartbeat?: string
}

// 异常类型
export interface AdminException {
  type: 'attendance' | 'device'
  [key: string]: any
}

export const adminApi = {
  // 统计仪表盘
  getStats: (): Promise<{ success: boolean; data: AdminStats }> => {
    return api.get('/admin/stats')
  },

  // 用户管理
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

  // 设备管理
  getDevices: (): Promise<{ success: boolean; data: AdminDevice[] }> => {
    return api.get('/admin/devices')
  },
  createDevice: (data: Partial<AdminDevice>): Promise<{ success: boolean; data: { id: number } }> => {
    return api.post('/admin/devices', data)
  },
  updateDevice: (deviceId: string, data: Partial<AdminDevice>): Promise<{ success: boolean }> => {
    return api.put(`/admin/devices/${deviceId}`, data)
  },
  deleteDevice: (deviceId: string): Promise<{ success: boolean }> => {
    return api.delete(`/admin/devices/${deviceId}`)
  },
  heartbeat: (deviceId: string, ipAddress: string): Promise<{ success: boolean }> => {
    return api.post('/admin/devices/heartbeat', { device_id: deviceId, ip_address: ipAddress })
  },

  // 配置管理
  getConfig: (): Promise<{ success: boolean; data: any }> => {
    return api.get('/admin/config')
  },
  saveConfig: (config: any): Promise<{ success: boolean; message: string }> => {
    return api.post('/admin/config', config)
  },

  // 诊断与日志
  getDiagnosis: (): Promise<{ success: boolean; data: any[] }> => {
    return api.get('/admin/diagnosis')
  },
  getLogs: (): Promise<{ success: boolean; data: any[] }> => {
    return api.get('/admin/logs')
  },

  // 异常提醒
  getExceptions: (): Promise<{ success: boolean; data: { attendance: any[]; devices: any[] } }> => {
    return api.get('/admin/exceptions')
  }
}