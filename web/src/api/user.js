import http from './http'

export const getMe = () => http.get('/users/me')
export const updateMe = (payload) => http.patch('/users/me', payload)
export const updateAvatar = (payload) => http.put('/users/me/avatar', payload)
export const submitVerification = (payload) => http.post('/users/me/verification', payload)
export const getVerification = () => http.get('/users/me/verification')
export const getUser = (id) => http.get(`/users/${id}`)
export const getUserProducts = (id, params) => http.get(`/users/${id}/products`, { params })
export const getUserReviews = (id, params) => http.get(`/users/${id}/reviews`, { params })
export const reportPushToken = (payload) => http.post('/users/me/push-token', payload)
