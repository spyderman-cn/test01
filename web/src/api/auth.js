import http from './http'

export const sendSmsCode = (payload) => http.post('/auth/sms-code', payload)
export const register = (payload) => http.post('/auth/register', payload)
export const login = (payload) => http.post('/auth/login', payload)
export const loginBySms = (payload) => http.post('/auth/login/sms', payload)
export const refreshToken = (payload) => http.post('/auth/token/refresh', payload)
export const logout = () => http.post('/auth/logout')
export const resetPassword = (payload) => http.post('/auth/password/reset', payload)
export const changePassword = (payload) => http.post('/auth/password/change', payload)
