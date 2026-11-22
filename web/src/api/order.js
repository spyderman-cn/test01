import http from './http'

export const createOrder = (payload) => http.post('/orders', payload)
export const listOrders = (params) => http.get('/orders', { params })
export const getOrder = (id) => http.get(`/orders/${id}`)
export const cancelOrder = (id, payload) => http.post(`/orders/${id}/cancel`, payload)
export const shipOrder = (id, payload) => http.post(`/orders/${id}/ship`, payload)
export const confirmOrder = (id) => http.post(`/orders/${id}/confirm`, { confirm: true })
export const applyRefund = (id, payload) => http.post(`/orders/${id}/refunds`, payload)
export const handleRefund = (id, payload) => http.post(`/refunds/${id}/handle`, payload)
export const getOrderLogs = (id) => http.get(`/orders/${id}/logs`)
export const createReview = (id, payload) => http.post(`/orders/${id}/reviews`, payload)

export const createPayment = (payload) => http.post('/payments', payload)
export const getPayment = (id) => http.get(`/payments/${id}`)
export const closePayment = (id) => http.post(`/payments/${id}/close`)
