import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { login as apiLogin, register as apiRegister, loginBySms, logout as apiLogout } from '@/api/auth'
import { getMe, updateMe } from '@/api/user'
import { getUnreadCount } from '@/api/notification'
import { getToken, setToken, clearToken } from '@/api/http'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    profile: null,
    unread: 0,
    loadingProfile: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isVerified: (state) => !!state.profile?.verified,
    displayName: (state) => state.profile?.nickname || '未登录',
  },
  actions: {
    applySession(result) {
      this.token = result.accessToken
      this.profile = result.user
      setToken(result.accessToken, result.refreshToken)
    },
    async login(payload) {
      const result = await apiLogin(payload)
      this.applySession(result)
      this.fetchUnread()
      return result
    },
    async loginWithSms(payload) {
      const result = await loginBySms(payload)
      this.applySession(result)
      this.fetchUnread()
      return result
    },
    async register(payload) {
      const result = await apiRegister(payload)
      this.applySession(result)
      return result
    },
    async fetchProfile(force = false) {
      if (!this.token) return null
      if (this.profile && !force) return this.profile
      this.loadingProfile = true
      try {
        this.profile = await getMe()
        return this.profile
      } catch {
        return null
      } finally {
        this.loadingProfile = false
      }
    },
    async updateProfile(payload) {
      const profile = await updateMe(payload)
      this.profile = profile
      ElMessage.success('资料已更新')
      return profile
    },
    async fetchUnread() {
      if (!this.token) {
        this.unread = 0
        return
      }
      try {
        const result = await getUnreadCount()
        this.unread = result.total
      } catch {
        this.unread = 0
      }
    },
    async logout() {
      try {
        await apiLogout()
      } catch {
        /* 忽略退出接口异常 */
      }
      this.reset()
    },
    reset() {
      this.token = ''
      this.profile = null
      this.unread = 0
      clearToken()
    },
  },
})
