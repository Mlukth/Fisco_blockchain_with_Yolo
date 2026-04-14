import request from './request'

export const getStats = () => request.get('/admin/stats')
export const getDevices = () => request.get('/admin/devices')
export const createDevice = (data) => request.post('/admin/devices', data)
export const updateDevice = (id, data) => request.put(`/admin/devices/${id}`, data)
export const deleteDevice = (id) => request.delete(`/admin/devices/${id}`)
export const getUsers = (role) => request.get('/admin/users', { params: { role } })
export const createUser = (data) => request.post('/admin/users', data)
export const updateUser = (id, data) => request.put(`/admin/users/${id}`, data)
export const deleteUser = (id) => request.delete(`/admin/users/${id}`)
export const getExceptions = () => request.get('/admin/exceptions')
export const verifyAll = () => request.post('/admin/verify-all')