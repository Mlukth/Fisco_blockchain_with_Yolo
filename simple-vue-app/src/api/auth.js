import request from './request'

export const login = (username, password) => {
  return request.post('/auth/login', { username, password })
}