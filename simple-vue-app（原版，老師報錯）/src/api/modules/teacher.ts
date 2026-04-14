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
  classroom: string
  date: string
  stats: {
    present: number
    late: number
    absent: number
    leave: number
    total: number
  }
  records: TeacherAttendanceRecord[]
}

export interface TeacherHistoryResponse {
  success: boolean
  data: {
    summary: {
      totalDays: number
      avgRate: number
      lateCount: number
      absentCount: number
    }
    history: Array<{
      date: string
      present: number
      late: number
      absent: number
      leave: number
      total: number
    }>
  }
}

export const teacherApi = {
  // 获取今日班级考勤（后端接口为 /teacher/class/attendance，无需参数）
  getClassAttendance: (): Promise<{ success: boolean; data: ClassAttendanceData }> => {
    return api.get('/teacher/class/attendance')
  },

  // 获取历史统计（支持日期范围）
  getHistory: (start?: string, end?: string): Promise<TeacherHistoryResponse> => {
    return api.get('/teacher/class/history', { params: { start, end } })
  },

  // 获取异常复核列表
  getExceptions: (): Promise<{ success: boolean; data: TeacherAttendanceRecord[] }> => {
    return api.get('/teacher/exceptions')
  },

  // 提交复核
  submitReview: (recordId: number, isReviewed: boolean, note: string): Promise<{ success: boolean }> => {
    return api.post('/teacher/review', { recordId, isReviewed, note })
  }
}