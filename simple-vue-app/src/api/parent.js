import request from './request'

export const getAttendance = () => request.get('/parent/attendance')
export const getHistory = (params) => request.get('/parent/history', { params })