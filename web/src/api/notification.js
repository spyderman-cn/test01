import http from './http'

export const listNotifications = (params) => http.get('/notifications', { params })
export const getUnreadCount = () => http.get('/notifications/unread-count')
export const readNotifications = (payload = {}) => http.post('/notifications/read', payload)
