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

export const teacherApi = {
  // 今日班级考勤
  getClassAttendance: (): Promise<{ success: boolean; data: ClassAttendanceData }> => {
    return api.get('/teacher/class/attendance')
  },

  // 历史统计
  getHistory: (start?: string, end?: string): Promise<{
    success: boolean
    data: {
      summary: { totalDays: number; avgRate: number; lateCount: number; absentCount: number }
      history: any[]
    }
  }> => {
    return api.get('/teacher/class/history', { params: { start, end } })
  },

  // 异常复核列表
  getExceptions: (): Promise<{ success: boolean; data: TeacherAttendanceRecord[] }> => {
    return api.get('/teacher/exceptions')
  },

  // 提交复核
  submitReview: (recordId: number, isReviewed: boolean, note: string): Promise<{ success: boolean }> => {
    return api.post('/teacher/review', { recordId, isReviewed, note })
  }
}