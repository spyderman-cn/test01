import http from './http'

export const createReport = (payload) => http.post('/reports', payload)
export const listMyReports = (params) => http.get('/users/me/reports', { params })
