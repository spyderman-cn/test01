<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="container header-inner">
        <router-link to="/" class="brand">
          <span class="logo">校</span>
          <span class="brand-text">
            <strong>校集</strong>
            <small>校园二手</small>
          </span>
        </router-link>

        <div class="search">
          <el-input
            v-model="keyword"
            size="large"
            placeholder="搜一搜：键盘、iPad、考研资料…"
            clearable
            @keyup.enter="onSearch"
          >
            <template #suffix>
              <el-icon class="search-btn" @click="onSearch"><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <nav class="nav">
          <router-link to="/products" class="nav-link">全部商品</router-link>
          <router-link to="/orders" class="nav-link">订单</router-link>
          <router-link to="/chat" class="nav-link">消息</router-link>
          <router-link to="/notifications" class="nav-link bell" title="通知">
            <el-badge :value="user.unread" :hidden="!user.unread" :max="99">
              <el-icon :size="19"><Bell /></el-icon>
            </el-badge>
          </router-link>

          <el-button type="primary" round class="publish-btn" @click="goPublish">
            <el-icon><Plus /></el-icon>
            <span>发布闲置</span>
          </el-button>

          <el-dropdown v-if="user.isLoggedIn" trigger="click" @command="onCommand">
            <div class="user-chip">
              <el-avatar :size="30" :src="user.profile?.avatar">{{ user.displayName[0] }}</el-avatar>
              <span class="name ellipsis">{{ user.displayName }}</span>
              <el-icon class="arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="orders">我的订单</el-dropdown-item>
                <el-dropdown-item command="publish">发布闲置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button v-else text class="login-btn" @click="router.push({ name: 'login' })">
            登录 / 注册
          </el-button>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="site-footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <span class="logo sm">校</span>
          <div>
            <strong>校集 · 校园二手交易平台</strong>
            <p>同校认证 · 当面验货 · 让闲置流动起来</p>
          </div>
        </div>
        <div class="footer-meta">
          <span>Vue 3 + Vite + Element Plus</span>
          <span>演示数据仅保存在本机浏览器</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'

const router = useRouter()
const route = useRoute()
const user = useUserStore()
const catalog = useCatalogStore()
const keyword = ref(String(route.query.keyword || ''))

let timer = null

const onSearch = () => {
  router.push({ name: 'products', query: keyword.value ? { keyword: keyword.value } : {} })
}

const goPublish = () => {
  if (!user.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: '/publish' } })
    return
  }
  router.push({ name: 'publish' })
}

const onCommand = async (command) => {
  if (command === 'profile') router.push({ name: 'profile' })
  else if (command === 'orders') router.push({ name: 'orders' })
  else if (command === 'publish') goPublish()
  else if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定退出当前账号吗？', '退出登录', {
        confirmButtonText: '退出',
        cancelButtonText: '再逛逛',
        type: 'warning',
      })
      await user.logout()
      ElMessage.success('已退出登录')
      router.push({ name: 'home' })
    } catch {
      /* 取消 */
    }
  }
}

const onUnauthorized = () => {
  user.reset()
  if (route.name !== 'login') {
    ElMessage.warning('登录状态已失效，请重新登录')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
  }
}

onMounted(async () => {
  catalog.load()
  window.addEventListener('app:unauthorized', onUnauthorized)
  if (user.isLoggedIn) {
    user.fetchProfile()
    user.fetchUnread()
    timer = setInterval(() => user.fetchUnread(), 60000)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('app:unauthorized', onUnauthorized)
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.app-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.header-inner {
  height: 68px;
  display: flex;
  align-items: center;
  gap: 22px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: linear-gradient(140deg, #14b884, #0b7d57);
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  box-shadow: 0 6px 14px rgba(14, 159, 110, 0.28);
}

.logo.sm {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  font-size: 15px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-text strong {
  font-size: 17px;
  letter-spacing: 1px;
}

.brand-text small {
  font-size: 11px;
  color: var(--ink-500);
  letter-spacing: 2px;
}

.search {
  flex: 1;
  max-width: 460px;
}

.search :deep(.el-input__wrapper) {
  border-radius: 999px;
  background: #f3f6f5;
  box-shadow: none;
  border: 1px solid transparent;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.search :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  border-color: var(--brand);
}

.search-btn {
  cursor: pointer;
  color: var(--brand);
  font-size: 17px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
  flex-shrink: 0;
}

.nav-link {
  font-size: 14px;
  color: var(--ink-700);
  position: relative;
  padding: 4px 2px;
  transition: color 0.15s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--brand);
}

.bell {
  display: inline-flex;
  align-items: center;
  color: var(--ink-700);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s ease;
  max-width: 150px;
}

.user-chip:hover {
  background: #f3f6f5;
}

.user-chip .name {
  font-size: 14px;
  max-width: 76px;
}

.user-chip .arrow {
  font-size: 12px;
  color: var(--ink-400);
}

.login-btn {
  color: var(--ink-700);
}

.site-main {
  flex: 1;
}

.site-footer {
  border-top: 1px solid var(--line);
  background: #fff;
  padding: 26px 0;
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-brand strong {
  font-size: 14px;
}

.footer-brand p,
.footer-meta {
  font-size: 12px;
  color: var(--ink-500);
}

.footer-meta {
  display: flex;
  gap: 18px;
}

@media (max-width: 980px) {
  .nav-link {
    display: none;
  }
  .search {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .brand-text {
    display: none;
  }
  .publish-btn span {
    display: none;
  }
  .user-chip .name,
  .user-chip .arrow {
    display: none;
  }
}
</style>
