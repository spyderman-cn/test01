import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '@/api/http'
import AppLayout from '@/layout/AppLayout.vue'

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页' } },
      { path: 'products', name: 'products', component: () => import('@/views/ProductListView.vue'), meta: { title: '全部商品' } },
      { path: 'products/:id', name: 'product-detail', component: () => import('@/views/ProductDetailView.vue'), meta: { title: '商品详情' } },
      { path: 'publish', name: 'publish', component: () => import('@/views/PublishView.vue'), meta: { title: '发布闲置', auth: true } },
      { path: 'orders', name: 'orders', component: () => import('@/views/OrdersView.vue'), meta: { title: '我的订单', auth: true } },
      { path: 'orders/:id', name: 'order-detail', component: () => import('@/views/OrderDetailView.vue'), meta: { title: '订单详情', auth: true } },
      { path: 'chat', name: 'chat', component: () => import('@/views/ChatView.vue'), meta: { title: '消息', auth: true } },
      { path: 'chat/:id', name: 'chat-detail', component: () => import('@/views/ChatView.vue'), meta: { title: '消息', auth: true } },
      { path: 'profile', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { title: '个人中心', auth: true } },
      { path: 'notifications', name: 'notifications', component: () => import('@/views/NotificationsView.vue'), meta: { title: '通知', auth: true } },
      { path: 'login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path === from.path) return {}
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.meta.auth && !getToken()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && getToken()) {
    return { name: 'home' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 校集` : '校集 · 校园二手交易'
})

export default router
