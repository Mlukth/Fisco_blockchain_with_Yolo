import api from '../index'

export interface ParentStudent {
  anonymousId: string
  name: string
  class: string
  attendance: {
    status: string
    time: string | null
  }
}

export interface ParentHistoryRecord {
  id: number
  anonymous_id: string
  status: string
  time: string
  classroom_id: string
  is_reviewed: number
}

export const parentApi = {
  // 获取孩子今日考勤
  getAttendance: (): Promise<{ success: boolean; data: ParentStudent[] }> => {
    return api.get('/parent/attendance')
  },

  // 获取孩子历史考勤
  getHistory: (anonymousId: string, month: string): Promise<{
    success: boolean
    data: {
      student: { name: string; anonymousId: string; class: string }
      month: string
      summary: { present: number; late: number; absent: number; leave: number }
      records: ParentHistoryRecord[]
    }
  }> => {
    return api.get('/parent/history', { params: { anonymousId, month } })
  }
}