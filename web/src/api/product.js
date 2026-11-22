import http from './http'

export const getCategories = () => http.get('/categories')
export const getCampuses = () => http.get('/campuses')

export const createProduct = (payload) => http.post('/products', payload)
export const listProducts = (params) => http.get('/products', { params })
export const getProduct = (id) => http.get(`/products/${id}`)
export const updateProduct = (id, payload) => http.patch(`/products/${id}`, payload)
export const changeProductStatus = (id, payload) => http.post(`/products/${id}/status`, payload)
export const deleteProduct = (id) => http.delete(`/products/${id}`)
export const listMyProducts = (params) => http.get('/products/mine', { params })
export const getRecommended = (params) => http.get('/products/recommended', { params })
export const listProductReviews = (id, params) => http.get(`/products/${id}/reviews`, { params })

export const favoriteProduct = (id) => http.post(`/products/${id}/favorite`)
export const unfavoriteProduct = (id) => http.delete(`/products/${id}/favorite`)
export const listFavorites = (params) => http.get('/users/me/favorites', { params })
export const listHistory = (params) => http.get('/users/me/history', { params })
export const clearHistory = () => http.delete('/users/me/history')
