import request from './request'

export const getClassAttendance = () => request.get('/teacher/class/attendance')
export const getClassHistory = (params) => request.get('/teacher/class/history', { params })
export const getExceptions = () => request.get('/teacher/exceptions')
export const submitReview = (data) => request.post('/teacher/review', data)