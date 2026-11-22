import axios from 'axios'
import { ElMessage } from 'element-plus'
import { isMockEnabled, mockAdapter } from '@/mock'

export const TOKEN_KEY = 'campus-market:token'
const REFRESH_KEY = 'campus-market:refresh'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY) || ''
export const setToken = (token, refreshToken) => {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  ...(isMockEnabled ? { adapter: mockAdapter } : {}),
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    if (typeof config.headers.set === 'function') config.headers.set('Authorization', `Bearer ${token}`)
    else config.headers.Authorization = `Bearer ${token}`
  }
  const requestId = globalThis.crypto?.randomUUID?.() || String(Date.now())
  if (typeof config.headers.set === 'function') config.headers.set('X-Request-Id', requestId)
  else config.headers['X-Request-Id'] = requestId
  return config
})

const AUTH_EXPIRED = [20001, 20002, 20003]

http.interceptors.response.use(
  (response) => {
    const payload = response.data
    // 非统一响应（如文件流）直接返回
    if (!payload || typeof payload !== 'object' || !('code' in payload)) return payload
    if (payload.code === 0) return payload.data

    if (AUTH_EXPIRED.includes(payload.code)) {
      clearToken()
      window.dispatchEvent(new CustomEvent('app:unauthorized'))
    }
    const error = new ApiError(payload.code, payload.message || '请求失败')
    // 静默场景由调用方自行 catch
    if (!error.__silent) ElMessage.error(error.message)
    return Promise.reject(error)
  },
  (error) => {
    const message = error?.response?.status
      ? `请求失败（${error.response.status}）`
      : error?.code === 'ECONNABORTED'
        ? '请求超时，请稍后重试'
        : '网络异常，请检查网络后重试'
    ElMessage.error(message)
    return Promise.reject(new ApiError(-1, message))
  },
)

export default http
