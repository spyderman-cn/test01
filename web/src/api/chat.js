import http from './http'

export const listConversations = (params) => http.get('/conversations', { params })
export const createConversation = (payload) => http.post('/conversations', payload)
export const listMessages = (id, params) => http.get(`/conversations/${id}/messages`, { params })
export const sendMessage = (id, payload) => http.post(`/conversations/${id}/messages`, payload)
export const readConversation = (id, payload) => http.post(`/conversations/${id}/read`, payload)
