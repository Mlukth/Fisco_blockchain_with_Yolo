import api from '../index'

export interface AnonymousMapping {
  anonymous_id: string
  student_name: string
  grade?: string
  class_name?: string
  parent_phone?: string
  created_at?: string
}

export interface ParentChildBind {
  parent_username: string
  child_anonymous_id: string
}

export const mappingApi = {
  // 获取所有映射
  getAll: (): Promise<{ success: boolean; data: AnonymousMapping[] }> => {
    return api.get('/attend/mapping')
  },

  // 新增映射
  create: (data: AnonymousMapping): Promise<{ success: boolean }> => {
    return api.post('/attend/mapping', data)
  },

  // 更新映射
  update: (anonymous_id: string, data: Partial<AnonymousMapping>): Promise<{ success: boolean }> => {
    return api.put(`/attend/mapping/${anonymous_id}`, data)
  },

  // 删除映射
  delete: (anonymous_id: string): Promise<{ success: boolean }> => {
    return api.delete(`/attend/mapping/${anonymous_id}`)
  },

  // CSV 批量导入
  importCsv: (file: File): Promise<{ success: boolean; imported: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/attend/mapping/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // 获取联表考勤记录（用于教师端显示真实姓名）
  getRecordsWithNames: (class_name?: string, date?: string): Promise<{
    success: boolean
    data: Array<{
      id: number
      anonymous_id: string
      student_name: string
      grade: string
      class_name: string
      time: string
      status: string
      merkle_root?: string
      device_id?: string
    }>
  }> => {
    return api.get('/attend/records-with-names', { params: { class_name, date } })
  },

  // 家长绑定孩子
  bindChild: (parentUsername: string, childAnonymousId: string): Promise<{ success: boolean }> => {
    return api.post('/parent/bind', { parentUsername, childAnonymousId })
  },

  // 获取家长已绑定的孩子列表
  getChildren: (): Promise<{ success: boolean; data: AnonymousMapping[] }> => {
    return api.get('/parent/children')
  }
}