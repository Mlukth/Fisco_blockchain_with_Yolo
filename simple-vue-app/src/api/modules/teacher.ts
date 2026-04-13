import api from '../index'

export interface TeacherAttendanceRecord {
  id: number
  anonymous_id: string
  student_name?: string
  status: 'present' | 'late' | 'absent' | 'leave'
  time: string
  classroom_id: string
  device_id: string
  is_reviewed: number
  review_note?: string
}

export interface ClassAttendanceData {
  classId: string
  date: string
  stats: {
    present: number
    late: number
    absent: number
    leave: number
  }
  records: TeacherAttendanceRecord[]
}

export interface TeacherHistoryResponse {
  success: boolean
  data: {
    classId: string
    month: string
    stats: {
      present: number
      late: number
      absent: number
      leave: number
    }
    records: TeacherAttendanceRecord[]
  }
}

export const teacherApi = {
  // 获取今日班级考勤（使用班级ID，此处班级ID固定为"一年级1班"，与后端路由 /class/:classId 匹配）
  getClassAttendance: (classId: string = '一年级1班'): Promise<{ success: boolean; data: ClassAttendanceData }> => {
    return api.get(`/teacher/class/${encodeURIComponent(classId)}`)
  },

  // 获取历史统计（按月查询）
  getHistory: (classId: string, month: string): Promise<TeacherHistoryResponse> => {
    return api.get(`/teacher/history/${encodeURIComponent(classId)}`, { params: { month } })
  },

  // 获取异常复核列表
  getExceptions: (classId?: string): Promise<{ success: boolean; data: TeacherAttendanceRecord[] }> => {
    // 后端暂无异常复核接口，此处暂时返回空数组或可保留以供后续扩展
    return api.get('/teacher/exceptions', { params: { classId } })
  },

  // 提交复核
  submitReview: (recordId: number, isReviewed: boolean, note: string): Promise<{ success: boolean }> => {
    return api.post('/teacher/review', { recordId, isReviewed, note })
  }
}