/**
 * 演示用 Mock 适配器（axios adapter）。
 *
 * 打开 .env 的 VITE_USE_MOCK=true 时，所有请求都会被这里接管：
 * 数据存在 localStorage，刷新不丢；「我的 → 重置演示数据」可恢复初始状态。
 * 关闭 mock 后，同一套 api/*.js 直接请求真实后端，无需改页面代码。
 */
import { createSeedDb } from './db'
import { coverImage, maskPhone } from '@/utils/format'

const STORAGE_KEY = 'campus-market:mock-db'
const LATENCY = [120, 380]

/* ------------------------------ 存储 ------------------------------ */

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === 1) return parsed
    }
  } catch {
    /* 解析失败则重建 */
  }
  const seeded = createSeedDb()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

let db = loadDb()

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* 存储满时忽略 */
  }
}

export function resetMockDb() {
  db = createSeedDb()
  save()
}

/* ------------------------------ 工具 ------------------------------ */

class ApiError extends Error {
  constructor(code, message, status = 200) {
    super(message)
    this.isApiError = true
    this.code = code
    this.status = status
  }
}

const fail = (code, message, status) => {
  throw new ApiError(code, message, status)
}

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

const nowIso = () => new Date().toISOString()

function nextId() {
  db.meta = db.meta || { seq: 9000 }
  db.meta.seq += 1
  return `190000000${String(db.meta.seq).padStart(4, '0')}`
}

const clone = (v) => JSON.parse(JSON.stringify(v))

function paginate(list, query = {}) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
    hasMore: start + pageSize < list.length,
  }
}

const currentUser = () => (db.session ? db.users.find((u) => u.id === db.session.userId) : null)

function requireUser() {
  const user = currentUser()
  if (!user) fail(20001, '请先登录')
  if (user.status === 'BANNED') fail(20005, '账号已被封禁')
  return user
}

const findProduct = (id) => db.products.find((p) => p.id === String(id))
const findUser = (id) => db.users.find((u) => u.id === String(id))

function categoryPath(categoryId) {
  for (const top of db.categories) {
    if (top.id === categoryId) return [top.name]
    const child = top.children.find((c) => c.id === categoryId)
    if (child) return [top.name, child.name]
  }
  return ['其他']
}

function userStats(userId) {
  const mine = db.products.filter((p) => p.sellerId === userId)
  return {
    onSale: mine.filter((p) => p.status === 'ON_SALE').length,
    sold: db.orders.filter((o) => o.sellerId === userId && o.status === 'COMPLETED').length,
    bought: db.orders.filter((o) => o.buyerId === userId && o.status === 'COMPLETED').length,
    favorites: (db.favorites[userId] || []).length,
  }
}

function toUserView(user) {
  const campus = db.campuses.find((c) => c.id === user.campusId)
  return {
    ...clone(user),
    phone: maskPhone(user.phone),
    campus,
    stats: userStats(user.id),
  }
}

function toPublicUser(user) {
  const summary = toUserSummary(user)
  return {
    ...summary,
    bio: user.bio,
    campus: db.campuses.find((c) => c.id === user.campusId) || null,
    createdAt: user.createdAt,
  }
}

function toUserSummary(user) {
  if (!user) return null
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    creditScore: user.creditScore,
    verified: user.verified,
    soldCount: db.orders.filter((o) => o.sellerId === user.id && o.status === 'COMPLETED').length,
  }
}

function toProductSummary(p, viewerId) {
  return {
    id: p.id,
    title: p.title,
    cover: p.images[0],
    price: p.price,
    originalPrice: p.originalPrice,
    condition: p.condition,
    status: p.status,
    tradeTypes: p.tradeTypes,
    campus: db.campuses.find((c) => c.id === p.campusId) || null,
    seller: toUserSummary(findUser(p.sellerId)),
    stats: { views: p.stats.views, favorites: p.stats.favorites },
    createdAt: p.createdAt,
  }
}

function toProductDetail(p, viewerId) {
  const favors = db.favorites[viewerId] || []
  return {
    ...toProductSummary(p, viewerId),
    description: p.description,
    categoryId: p.categoryId,
    categoryPath: categoryPath(p.categoryId),
    images: p.images,
    tags: p.tags,
    negotiable: p.negotiable,
    shippingFee: p.shippingFee,
    meetPlace: p.meetPlace,
    stats: p.stats,
    favorited: favors.includes(p.id),
    canBuy:
      p.status === 'ON_SALE' &&
      viewerId !== p.sellerId &&
      !!findUser(viewerId)?.verified,
    updatedAt: p.updatedAt,
  }
}

function orderProduct(o) {
  const p = findProduct(o.productId)
  return p
    ? { id: p.id, title: p.title, cover: p.images[0], price: p.price, condition: p.condition }
    : null
}

function toOrderSummary(o, viewerId) {
  const counterpartId = o.buyerId === viewerId ? o.sellerId : o.buyerId
  return {
    id: o.id,
    orderNo: o.orderNo,
    status: o.status,
    tradeType: o.tradeType,
    product: orderProduct(o),
    amount: o.amount,
    counterparty: toUserSummary(findUser(counterpartId)),
    createdAt: o.createdAt,
  }
}

function toOrderDetail(o, viewerId) {
  const campus = o.meetInfo ? db.campuses.find((c) => c.id === o.meetInfo.campusId) : null
  return {
    ...toOrderSummary(o, viewerId),
    buyer: toUserSummary(findUser(o.buyerId)),
    seller: toUserSummary(findUser(o.sellerId)),
    meetInfo: o.meetInfo ? { campus, place: o.meetInfo.place, expectTime: o.meetInfo.expectTime } : null,
    address: o.address,
    express: o.express,
    remark: o.remark,
    payment: o.payment,
    timeline: o.timeline,
    reviewed: o.reviews,
    expireAt: o.expireAt,
  }
}

function pushNotification(userId, type, title, content, payload = {}) {
  db.notifications.unshift({
    id: nextId(),
    userId,
    type,
    title,
    content,
    payload,
    read: false,
    createdAt: nowIso(),
  })
}

function addOrderLog() {
  /* 演示项目不落库流转日志，按时间线推导 */
}

function orderLogs(o) {
  const logs = []
  const push = (from, to, operator, remark, at) => {
    if (!at) return
    logs.push({ from, to, operator, remark, createdAt: at })
  }
  push(null, 'PENDING_PAYMENT', 'BUYER', '创建订单', o.timeline.createdAt)
  push('PENDING_PAYMENT', 'PAID', 'SYSTEM', '支付成功', o.timeline.paidAt)
  push('PAID', 'DELIVERING', 'SELLER', '卖家已发货', o.timeline.shippedAt)
  push('PAID', 'COMPLETED', 'BUYER', '买家确认交易完成', o.timeline.completedAt)
  push('PENDING_PAYMENT', 'CANCELLED', 'BUYER', '订单已取消', o.timeline.cancelledAt)
  push('COMPLETED', 'REFUNDED', 'SYSTEM', '退款完成', o.timeline.refundedAt)
  return logs
}

/* ------------------------------ 路由表 ------------------------------ */

const routes = []
const route = (method, pattern, fn) => routes.push({ method, pattern, fn })

/* ---------- 认证 ---------- */

route('POST', /^\/auth\/sms-code$/, (m, { data }) => {
  if (!/^1\d{10}$/.test(data.phone || '')) fail(10003, '手机号格式错误')
  return { expiresIn: 300, cooldown: 60 }
})

const issueSession = (user) => {
  const accessToken = `mock.${user.id}.${Date.now()}`
  const refreshToken = `rt_${uuid().replace(/-/g, '')}`
  db.session = { userId: user.id, accessToken, refreshToken }
  save()
  return {
    accessToken,
    refreshToken,
    expiresIn: 7200,
    user: toUserView(user),
  }
}

route('POST', /^\/auth\/login$/, (m, { data }) => {
  const account = String(data.account || '').trim()
  if (!account || !data.password) fail(10001, '账号和密码不能为空')
  const user = db.users.find((u) => u.phone === account || u.nickname === account || u.id === account)
  if (!user) fail(20009, '账号或密码错误（演示环境可用 13800001234 / 任意密码）')
  if (user.status === 'BANNED') fail(20005, '账号已被封禁')
  return issueSession(user)
})

route('POST', /^\/auth\/login\/sms$/, (m, { data }) => {
  const user = db.users.find((u) => u.phone === data.phone)
  if (!user) fail(20009, '该手机号尚未注册')
  return issueSession(user)
})

route('POST', /^\/auth\/register$/, (m, { data }) => {
  if (!data.phone || !data.password || !data.nickname) fail(10001, '注册信息不完整')
  if (db.users.some((u) => u.phone === data.phone)) fail(20010, '手机号已注册')
  const user = {
    id: nextId(),
    nickname: data.nickname,
    avatar: coverImage(data.nickname.slice(0, 1), Math.floor(Math.random() * 360), 200, 200),
    bio: '',
    gender: 0,
    phone: data.phone,
    email: null,
    schoolId: 1,
    campusId: 1,
    verified: false,
    verification: { status: 'NONE', realName: null, studentNo: null, submittedAt: null, reviewedAt: null, rejectReason: null },
    creditScore: 80,
    role: 'USER',
    status: 'ACTIVE',
    createdAt: nowIso(),
  }
  db.users.push(user)
  return issueSession(user)
})

route('POST', /^\/auth\/token\/refresh$/, (m, { data }) => {
  const user = currentUser()
  if (!user || !data.refreshToken) fail(20003, 'refresh token 无效')
  return issueSession(user)
})

route('POST', /^\/auth\/logout$/, () => {
  db.session = null
  save()
  return null
})

route('POST', /^\/auth\/password\/reset$/, () => null)
route('POST', /^\/auth\/password\/change$/, () => null)

/* ---------- 用户 ---------- */

route('GET', /^\/users\/me$/, () => toUserView(requireUser()))

route('PATCH', /^\/users\/me$/, (m, { data }) => {
  const user = requireUser()
  const allowed = ['nickname', 'avatar', 'bio', 'gender', 'campusId', 'contactWechat']
  for (const key of allowed) {
    if (data[key] !== undefined) user[key] = data[key]
  }
  save()
  return toUserView(user)
})

route('PUT', /^\/users\/me\/avatar$/, (m, { data }) => {
  const user = requireUser()
  user.avatar = data.url
  save()
  return null
})

route('POST', /^\/users\/me\/verification$/, (m, { data }) => {
  const user = requireUser()
  if (user.verification.status === 'PENDING') fail(30004, '认证已提交，请等待审核')
  if (user.verification.status === 'APPROVED') fail(30005, '已完成学生认证')
  if (!data.realName || !data.studentNo) fail(30006, '请填写姓名与学号')
  user.verification = {
    status: 'PENDING',
    realName: `${data.realName.slice(0, 1)}*`,
    studentNo: String(data.studentNo).replace(/^(.{4}).*(.{2})$/, '$1****$2'),
    submittedAt: nowIso(),
    reviewedAt: null,
    rejectReason: null,
  }
  // 演示环境自动通过，方便体验完整流程
  setTimeout(() => {
    const target = findUser(user.id)
    if (target && target.verification.status === 'PENDING') {
      target.verification.status = 'APPROVED'
      target.verification.reviewedAt = nowIso()
      target.verified = true
      pushNotification(target.id, 'PRODUCT', '学生认证已通过', '现在可以发布商品和下单了。', {})
      save()
    }
  }, 2500)
  save()
  return user.verification
})

route('GET', /^\/users\/me\/verification$/, () => requireUser().verification)

route('POST', /^\/users\/me\/push-token$/, () => null)

route('GET', /^\/users\/me\/favorites$/, (m, { query }) => {
  const user = requireUser()
  const ids = db.favorites[user.id] || []
  const list = ids
    .map((id) => findProduct(id))
    .filter(Boolean)
    .map((p) => toProductSummary(p, user.id))
  return paginate(list, query)
})

route('GET', /^\/users\/me\/history$/, (m, { query }) => {
  const user = requireUser()
  const list = (db.history[user.id] || [])
    .map((h) => {
      const p = findProduct(h.productId)
      return p ? { ...toProductSummary(p, user.id), viewedAt: h.viewedAt } : null
    })
    .filter(Boolean)
  return paginate(list, query)
})

route('DELETE', /^\/users\/me\/history$/, () => {
  const user = requireUser()
  db.history[user.id] = []
  save()
  return null
})

route('GET', /^\/users\/me\/reports$/, (m, { query }) => paginate([], query))

route('POST', /^\/reports$/, (m, { data }) => {
  const user = requireUser()
  if (!data.targetType || !data.targetId) fail(10001, '举报对象不能为空')
  if (!data.description || String(data.description).length < 10) fail(10001, '举报说明至少 10 个字')
  const report = {
    id: nextId(),
    targetType: data.targetType,
    targetId: data.targetId,
    type: data.type || 'OTHER',
    description: data.description,
    images: data.images || [],
    status: 'PENDING',
    createdAt: nowIso(),
  }
  db.reports = db.reports || []
  db.reports.push(report)
  pushNotification(user.id, 'REPORT', '举报已提交', '我们会在 48 小时内处理，结果会通过通知告知。', {})
  save()
  return report
})

route('GET', /^\/users\/([^/]+)\/products$/, (m, { query }) => {
  const [, userId] = m
  const status = query.status || 'ON_SALE'
  const list = db.products
    .filter((p) => p.sellerId === userId && p.status === status)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((p) => toProductSummary(p, null))
  return paginate(list, query)
})

route('GET', /^\/users\/([^/]+)\/reviews$/, (m, { query }) => {
  const [, userId] = m
  const list = db.reviews
    .filter((r) => r.toUserId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((r) => ({
      ...r,
      fromUser: r.anonymous ? { id: null, nickname: '匿名用户', avatar: coverImage('匿', 0, 200, 200) } : toUserSummary(findUser(r.fromUserId)),
    }))
  const page = paginate(list, query)
  const count = list.length
  const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0
  return {
    ...page,
    summary: {
      averageRating: Number(avg.toFixed(1)),
      count,
      goodRate: count ? Number(((list.filter((r) => r.rating >= 4).length / count) * 100).toFixed(1)) : 0,
    },
  }
})

route('GET', /^\/users\/([^/]+)$/, (m) => {
  const user = findUser(m[1])
  if (!user) fail(30001, '用户不存在')
  return toPublicUser(user)
})

/* ---------- 字典 ---------- */

route('GET', /^\/categories$/, () =>
  db.categories.map((c) => ({
    ...c,
    children: c.children.map((child) => ({
      ...child,
      productCount: db.products.filter((p) => p.categoryId === child.id && p.status === 'ON_SALE').length,
    })),
  })),
)

route('GET', /^\/campuses$/, () => db.campuses)

/* ---------- 商品 ---------- */

function queryProducts(query, viewerId) {
  let list = db.products.filter((p) => p.status === 'ON_SALE')

  if (query.keyword) {
    const kw = String(query.keyword).toLowerCase()
    list = list.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(kw))
  }
  if (query.categoryId) {
    const top = db.categories.find((c) => c.id === Number(query.categoryId))
    const ids = top ? [top.id, ...top.children.map((c) => c.id)] : [Number(query.categoryId)]
    list = list.filter((p) => ids.includes(p.categoryId))
  }
  if (query.campusId) list = list.filter((p) => p.campusId === Number(query.campusId))
  if (query.minPrice) list = list.filter((p) => p.price >= Number(query.minPrice))
  if (query.maxPrice) list = list.filter((p) => p.price <= Number(query.maxPrice))
  if (query.condition) {
    const conds = String(query.condition).split(',').map(Number)
    list = list.filter((p) => conds.includes(p.condition))
  }
  if (query.tradeType) list = list.filter((p) => p.tradeTypes.includes(query.tradeType))
  if (query.sellerId) list = list.filter((p) => p.sellerId === query.sellerId)

  const sort = query.sort || 'latest'
  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
  else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
  else if (sort === 'hot') {
    list.sort((a, b) => b.stats.views + b.stats.favorites * 12 + b.stats.chats * 20 - (a.stats.views + a.stats.favorites * 12 + a.stats.chats * 20))
  } else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return list
}

route('GET', /^\/products$/, (m, { query }) => {
  const list = queryProducts(query, currentUser()?.id).map((p) => toProductSummary(p, currentUser()?.id))
  return paginate(list, query)
})

route('GET', /^\/products\/mine$/, (m, { query }) => {
  const user = requireUser()
  let list = db.products
    .filter((p) => p.sellerId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  if (query.status) {
    const statuses = String(query.status).split(',')
    list = list.filter((p) => statuses.includes(p.status))
  }
  const list2 = list.map((p) => ({
    ...toProductSummary(p, user.id),
    audit: { status: p.status === 'REJECTED' ? 'REJECTED' : 'APPROVED', reason: null, reviewedAt: p.updatedAt },
  }))
  return paginate(list2, query)
})

route('GET', /^\/products\/recommended$/, (m, { query }) => {
  const limit = Math.min(30, Number(query.limit) || 10)
  return queryProducts({ sort: 'hot', campusId: query.campusId }, currentUser()?.id)
    .slice(0, limit)
    .map((p) => toProductSummary(p, currentUser()?.id))
})

route('GET', /^\/products\/([^/]+)\/reviews$/, (m, { query }) => {
  const [, productId] = m
  const orderIds = db.orders.filter((o) => o.productId === productId).map((o) => o.id)
  const list = db.reviews
    .filter((r) => orderIds.includes(r.orderId))
    .map((r) => ({ ...r, fromUser: toUserSummary(findUser(r.fromUserId)) }))
  return paginate(list, query)
})

route('GET', /^\/products\/([^/]+)$/, (m) => {
  const product = findProduct(m[1])
  if (!product) fail(40001, '商品不存在或已删除')
  const viewer = currentUser()
  if (product.status !== 'ON_SALE' && product.sellerId !== viewer?.id) {
    fail(40008, '商品已下架')
  }
  if (viewer && viewer.id !== product.sellerId) {
    product.stats.views += 1
    db.history[viewer.id] = [
      { productId: product.id, viewedAt: nowIso() },
      ...(db.history[viewer.id] || []).filter((h) => h.productId !== product.id),
    ].slice(0, 200)
    save()
  }
  return toProductDetail(product, viewer?.id)
})

route('POST', /^\/products$/, (m, { data }) => {
  const user = requireUser()
  if (!user.verified) fail(20006, '请先完成学生认证')
  if (!data.title || !data.price) fail(10001, '请填写标题与价格')
  const product = {
    id: nextId(),
    sellerId: user.id,
    categoryId: Number(data.categoryId),
    title: data.title,
    description: data.description || '',
    price: Number(data.price),
    originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
    condition: Number(data.condition),
    tradeTypes: data.tradeTypes,
    images: data.images?.length ? data.images : [coverImage(data.title.slice(0, 6), Math.floor(Math.random() * 360))],
    campusId: Number(data.campusId) || 1,
    meetPlace: data.meetPlace || '校门口',
    shippingFee: Number(data.shippingFee) || 0,
    tags: data.tags || [],
    negotiable: !!data.negotiable,
    status: 'ON_SALE',
    stats: { views: 0, favorites: 0, chats: 0 },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.products.unshift(product)
  pushNotification(user.id, 'PRODUCT', '商品发布成功', `「${product.title}」已通过机审，正在展示中。`, { productId: product.id })
  save()
  return { id: product.id, status: product.status, auditStatus: 'APPROVED', createdAt: product.createdAt }
})

route('PATCH', /^\/products\/([^/]+)$/, (m, { data }) => {
  const user = requireUser()
  const product = findProduct(m[1])
  if (!product) fail(40001, '商品不存在')
  if (product.sellerId !== user.id) fail(40002, '无权操作该商品')
  if (['RESERVED', 'SOLD'].includes(product.status)) fail(40003, '当前状态不可编辑')
  const fields = ['title', 'description', 'categoryId', 'price', 'originalPrice', 'condition', 'tradeTypes', 'images', 'campusId', 'meetPlace', 'shippingFee', 'tags', 'negotiable']
  for (const key of fields) {
    if (data[key] !== undefined) product[key] = data[key]
  }
  product.updatedAt = nowIso()
  save()
  return toProductDetail(product, user.id)
})

route('DELETE', /^\/products\/([^/]+)$/, (m) => {
  const user = requireUser()
  const product = findProduct(m[1])
  if (!product) fail(40001, '商品不存在')
  if (product.sellerId !== user.id) fail(40002, '无权操作该商品')
  if (db.orders.some((o) => o.productId === product.id && ['PAID', 'DELIVERING', 'PENDING_PAYMENT'].includes(o.status))) {
    fail(40003, '存在进行中的订单，暂不可删除')
  }
  db.products = db.products.filter((p) => p.id !== product.id)
  save()
  return null
})

route('POST', /^\/products\/([^/]+)\/status$/, (m, { data }) => {
  const user = requireUser()
  const product = findProduct(m[1])
  if (!product) fail(40001, '商品不存在')
  if (product.sellerId !== user.id) fail(40002, '无权操作该商品')
  const action = data.action
  if (product.status === 'RESERVED') fail(40003, '商品交易中，暂不可修改状态')
  if (action === 'OFF_SHELF') product.status = 'OFF_SHELF'
  else if (action === 'ON_SALE') product.status = 'ON_SALE'
  else if (action === 'SOLD') product.status = 'SOLD'
  else fail(10003, '未知的状态操作')
  product.updatedAt = nowIso()
  save()
  return toProductDetail(product, user.id)
})

route('POST', /^\/products\/([^/]+)\/favorite$/, (m) => {
  const user = requireUser()
  const product = findProduct(m[1])
  if (!product) fail(40001, '商品不存在')
  const list = db.favorites[user.id] || (db.favorites[user.id] = [])
  if (!list.includes(product.id)) {
    list.push(product.id)
    product.stats.favorites += 1
  }
  save()
  return { favorited: true, favoriteCount: product.stats.favorites }
})

route('DELETE', /^\/products\/([^/]+)\/favorite$/, (m) => {
  const user = requireUser()
  const product = findProduct(m[1])
  if (!product) fail(40001, '商品不存在')
  const list = db.favorites[user.id] || []
  if (list.includes(product.id)) {
    db.favorites[user.id] = list.filter((id) => id !== product.id)
    product.stats.favorites = Math.max(0, product.stats.favorites - 1)
  }
  save()
  return { favorited: false, favoriteCount: product.stats.favorites }
})

/* ---------- 订单 ---------- */

route('POST', /^\/orders$/, (m, { data }) => {
  const user = requireUser()
  if (!user.verified) fail(20006, '请先完成学生认证')
  const product = findProduct(data.productId)
  if (!product) fail(40001, '商品不存在')
  if (product.sellerId === user.id) fail(50003, '不能购买自己的商品')
  if (product.status !== 'ON_SALE') fail(50002, '商品已被他人预订或已售出')
  if (!product.tradeTypes.includes(data.tradeType)) fail(50004, '该商品不支持此交易方式')
  if (data.tradeType === 'MEET' && !data.meetInfo?.place) fail(50007, '请填写面交地点')

  const shippingFee = data.tradeType === 'EXPRESS' ? product.shippingFee : 0
  const order = {
    id: nextId(),
    orderNo: String(Date.now()).padStart(16, '0').slice(0, 16),
    productId: product.id,
    buyerId: user.id,
    sellerId: product.sellerId,
    tradeType: data.tradeType,
    status: 'PENDING_PAYMENT',
    amount: {
      goodsAmount: product.price,
      shippingFee,
      discount: 0,
      payAmount: product.price + shippingFee,
    },
    meetInfo: data.tradeType === 'MEET' ? data.meetInfo : null,
    address: data.tradeType === 'EXPRESS' ? { id: 'addr1', receiver: user.nickname, phone: maskPhone(user.phone), detail: data.address || '东校区 3 号宿舍楼 401' } : null,
    express: null,
    remark: data.remark || '',
    payment: null,
    reviews: { buyer: false, seller: false },
    expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    timeline: {
      createdAt: nowIso(),
      paidAt: null,
      shippedAt: null,
      completedAt: null,
      cancelledAt: null,
      refundedAt: null,
    },
    createdAt: nowIso(),
  }
  product.status = 'RESERVED'
  db.orders.unshift(order)
  pushNotification(product.sellerId, 'ORDER', '你有一笔新订单', `「${product.title}」被下单，等待买家付款。`, { orderId: order.id })
  save()
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    payAmount: order.amount.payAmount,
    expireAt: order.expireAt,
  }
})

route('GET', /^\/orders$/, (m, { query }) => {
  const user = requireUser()
  const role = query.role === 'seller' ? 'sellerId' : 'buyerId'
  let list = db.orders.filter((o) => o[role] === user.id)
  if (query.status) {
    const statuses = String(query.status).split(',')
    list = list.filter((o) => statuses.includes(o.status))
  }
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return paginate(list.map((o) => toOrderSummary(o, user.id)), query)
})

route('GET', /^\/orders\/([^/]+)\/logs$/, (m) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === m[1])
  if (!order) fail(50001, '订单不存在')
  if (![order.buyerId, order.sellerId].includes(user.id)) fail(20004, '无权查看该订单')
  return orderLogs(order)
})

route('GET', /^\/orders\/([^/]+)$/, (m) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === m[1])
  if (!order) fail(50001, '订单不存在')
  if (![order.buyerId, order.sellerId].includes(user.id)) fail(20004, '无权查看该订单')
  return toOrderDetail(order, user.id)
})

route('POST', /^\/orders\/([^/]+)\/cancel$/, (m) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === m[1])
  if (!order) fail(50001, '订单不存在')
  if (order.buyerId !== user.id) fail(20004, '只有买家可以取消订单')
  if (order.status !== 'PENDING_PAYMENT') fail(50004, '该订单当前状态不可取消')
  order.status = 'CANCELLED'
  order.timeline.cancelledAt = nowIso()
  const product = findProduct(order.productId)
  if (product) product.status = 'ON_SALE'
  pushNotification(order.sellerId, 'ORDER', '订单已取消', '买家取消了订单，商品已重新上架。', { orderId: order.id })
  save()
  return null
})

route('POST', /^\/orders\/([^/]+)\/ship$/, (m, { data }) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === m[1])
  if (!order) fail(50001, '订单不存在')
  if (order.sellerId !== user.id) fail(20004, '只有卖家可以发货')
  if (order.status !== 'PAID' || order.tradeType !== 'EXPRESS') fail(50004, '当前订单不可发货')
  order.status = 'DELIVERING'
  order.express = { company: data.company, trackingNo: data.trackingNo, shippedAt: nowIso() }
  order.timeline.shippedAt = nowIso()
  pushNotification(order.buyerId, 'ORDER', '卖家已发货', `${data.company} ${data.trackingNo}`, { orderId: order.id })
  save()
  return toOrderDetail(order, user.id)
})

route('POST', /^\/orders\/([^/]+)\/confirm$/, (m) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === m[1])
  if (!order) fail(50001, '订单不存在')
  if (order.buyerId !== user.id) fail(20004, '只有买家可以确认')
  if (!['PAID', 'DELIVERING'].includes(order.status)) fail(50004, '当前订单不可确认')
  if (order.status === 'PAID' && order.tradeType === 'EXPRESS') fail(50004, '卖家还未发货')
  order.status = 'COMPLETED'
  order.timeline.completedAt = nowIso()
  const product = findProduct(order.productId)
  if (product) product.status = 'SOLD'
  const buyer = findUser(order.buyerId)
  const seller = findUser(order.sellerId)
  if (buyer) buyer.creditScore = Math.min(100, buyer.creditScore + 1)
  if (seller) seller.creditScore = Math.min(100, seller.creditScore + 1)
  pushNotification(order.sellerId, 'ORDER', '交易完成', '买家已确认交易完成，快去评价吧。', { orderId: order.id })
  save()
  return { status: order.status, productStatus: product?.status, creditDelta: 1, completedAt: order.timeline.completedAt }
})

route('POST', /^\/orders\/([^/]+)\/refunds$/, (m, { data }) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === m[1])
  if (!order) fail(50001, '订单不存在')
  if (order.buyerId !== user.id) fail(20004, '只有买家可以申请退款')
  if (!['PAID', 'DELIVERING', 'COMPLETED'].includes(order.status)) fail(50004, '当前订单不可申请退款')
  const refund = {
    id: nextId(),
    orderId: order.id,
    amount: Number(data.amount) || order.amount.payAmount,
    reason: data.reason,
    images: data.images || [],
    status: 'PENDING',
    rejectReason: null,
    createdAt: nowIso(),
    handledAt: null,
  }
  db.refunds = db.refunds || []
  db.refunds.push(refund)
  order.status = 'REFUNDING'
  pushNotification(order.sellerId, 'ORDER', '买家申请退款', data.reason, { orderId: order.id })
  save()
  return refund
})

route('POST', /^\/refunds\/([^/]+)\/handle$/, (m, { data }) => {
  const user = requireUser()
  const refund = (db.refunds || []).find((r) => r.id === m[1] || r.orderId === m[1])
  if (!refund) fail(50001, '退款单不存在')
  const order = db.orders.find((o) => o.id === refund.orderId)
  if (!order) fail(50001, '订单不存在')
  if (order.sellerId !== user.id) fail(20004, '只有卖家可以处理退款')
  if (data.action === 'AGREE') {
    refund.status = 'SUCCESS'
    refund.handledAt = nowIso()
    order.status = 'REFUNDED'
    order.timeline.refundedAt = nowIso()
    const product = findProduct(order.productId)
    if (product && product.status !== 'SOLD') product.status = 'ON_SALE'
  } else {
    refund.status = 'REJECTED'
    refund.rejectReason = data.rejectReason
    refund.handledAt = nowIso()
    order.status = 'PAID'
  }
  save()
  return refund
})

route('POST', /^\/orders\/([^/]+)\/reviews$/, (m, { data }) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === m[1])
  if (!order) fail(50001, '订单不存在')
  if (![order.buyerId, order.sellerId].includes(user.id)) fail(20004, '无权评价该订单')
  if (order.status !== 'COMPLETED') fail(80003, '订单未完成，暂不可评价')
  const isBuyer = order.buyerId === user.id
  if (isBuyer ? order.reviews.buyer : order.reviews.seller) fail(80004, '你已评价过该订单')
  const review = {
    id: nextId(),
    orderId: order.id,
    fromUserId: user.id,
    toUserId: isBuyer ? order.sellerId : order.buyerId,
    rating: Number(data.rating),
    tags: data.tags || [],
    content: data.content || '',
    anonymous: !!data.anonymous,
    role: isBuyer ? 'BUYER_TO_SELLER' : 'SELLER_TO_BUYER',
    createdAt: nowIso(),
  }
  db.reviews.push(review)
  if (isBuyer) order.reviews.buyer = true
  else order.reviews.seller = true
  pushNotification(review.toUserId, 'REVIEW', '收到一条新评价', '对方给了你一个评价，去看看。', { orderId: order.id })
  save()
  return { id: review.id, createdAt: review.createdAt }
})

/* ---------- 支付 ---------- */

route('POST', /^\/payments$/, (m, { data }) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.id === data.orderId)
  if (!order) fail(50001, '订单不存在')
  if (order.buyerId !== user.id) fail(20004, '无权支付该订单')
  if (order.status !== 'PENDING_PAYMENT') fail(60004, '订单已支付或已关闭')
  order.status = 'PAID'
  order.payment = {
    id: nextId(),
    channel: data.channel,
    status: 'SUCCESS',
    paidAt: nowIso(),
    amount: order.amount.payAmount,
    transactionId: `MOCK${Date.now()}`,
  }
  order.timeline.paidAt = nowIso()
  pushNotification(order.sellerId, 'PAYMENT', '买家已付款', '请尽快约定面交或发货。', { orderId: order.id })
  save()
  return {
    paymentId: order.payment.id,
    payStatus: 'SUCCESS',
    channel: data.channel,
    expireAt: order.expireAt,
    payParams: { mock: true },
  }
})

route('GET', /^\/payments\/([^/]+)$/, (m) => {
  const user = requireUser()
  const order = db.orders.find((o) => o.payment?.id === m[1])
  if (!order || order.buyerId !== user.id) fail(60001, '支付单不存在')
  return {
    id: order.payment.id,
    orderId: order.id,
    channel: order.payment.channel,
    status: order.payment.status,
    amount: order.payment.amount,
    transactionId: order.payment.transactionId,
    paidAt: order.payment.paidAt,
    createdAt: order.payment.paidAt,
  }
})

route('POST', /^\/payments\/([^/]+)\/close$/, () => null)

/* ---------- 聊天 ---------- */

function toConversation(c, viewerId) {
  const targetId = c.userIds.find((id) => id !== viewerId)
  const product = c.productId ? findProduct(c.productId) : null
  const msgs = db.messages.filter((m) => m.conversationId === c.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  const last = msgs[msgs.length - 1]
  return {
    id: c.id,
    targetUser: toUserSummary(findUser(targetId)),
    product: product
      ? { id: product.id, title: product.title, cover: product.images[0], price: product.price, status: product.status }
      : null,
    lastMessage: last ? { type: last.type, content: last.content, createdAt: last.createdAt } : null,
    unreadCount: c.unread?.[viewerId] || 0,
    updatedAt: c.updatedAt,
  }
}

route('GET', /^\/conversations$/, (m, { query }) => {
  const user = requireUser()
  const list = db.conversations
    .filter((c) => c.userIds.includes(user.id))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((c) => toConversation(c, user.id))
  return paginate(list, query)
})

route('POST', /^\/conversations$/, (m, { data }) => {
  const user = requireUser()
  const targetId = String(data.targetUserId)
  if (targetId === user.id) fail(70002, '不能给自己发消息')
  if (!findUser(targetId)) fail(30001, '用户不存在')
  let conversation = db.conversations.find(
    (c) => c.userIds.includes(user.id) && c.userIds.includes(targetId) && (!data.productId || c.productId === data.productId),
  )
  if (!conversation) {
    conversation = {
      id: `cv_${nextId()}`,
      userIds: [user.id, targetId],
      productId: data.productId || null,
      unread: {},
      updatedAt: nowIso(),
    }
    db.conversations.unshift(conversation)
    save()
  }
  return toConversation(conversation, user.id)
})

route('GET', /^\/conversations\/([^/]+)\/messages$/, (m, { query }) => {
  const user = requireUser()
  const conversation = db.conversations.find((c) => c.id === m[1])
  if (!conversation) fail(70001, '会话不存在')
  if (!conversation.userIds.includes(user.id)) fail(20004, '无权查看该会话')
  let msgs = db.messages
    .filter((msg) => msg.conversationId === conversation.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  if (query.beforeId) {
    const index = msgs.findIndex((msg) => msg.id === query.beforeId)
    if (index > 0) msgs = msgs.slice(0, index)
  }
  const limit = Math.min(50, Number(query.limit) || 20)
  const hasMore = msgs.length > limit
  return { list: msgs.slice(-limit), hasMore }
})

const AUTO_REPLIES = [
  '在的，可以约个时间看货～',
  '这个价格可以再聊，方便的话今晚图书馆东门见。',
  '成色我如实描述的，支持当面验货。',
  '好的，那我先给你留着，你到了跟我说一声。',
]

route('POST', /^\/conversations\/([^/]+)\/messages$/, (m, { data }) => {
  const user = requireUser()
  const conversation = db.conversations.find((c) => c.id === m[1])
  if (!conversation) fail(70001, '会话不存在')
  if (!conversation.userIds.includes(user.id)) fail(20004, '无权发送消息')
  if (!data.content) fail(70003, '消息内容不能为空')
  if (String(data.content).length > 500) fail(70003, '消息内容过长')
  const message = {
    id: `msg_${nextId()}`,
    conversationId: conversation.id,
    senderId: user.id,
    type: data.type || 'TEXT',
    content: data.content,
    status: 'SENT',
    createdAt: nowIso(),
  }
  db.messages.push(message)
  conversation.updatedAt = message.createdAt
  const targetId = conversation.userIds.find((id) => id !== user.id)
  conversation.unread = conversation.unread || {}
  conversation.unread[targetId] = (conversation.unread[targetId] || 0) + 1
  save()

  // 演示用：对方 1.5 秒后自动回一句
  const replyText = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
  setTimeout(() => {
    const conv = db.conversations.find((c) => c.id === conversation.id)
    if (!conv) return
    db.messages.push({
      id: `msg_${nextId()}`,
      conversationId: conv.id,
      senderId: targetId,
      type: 'TEXT',
      content: replyText,
      status: 'SENT',
      createdAt: nowIso(),
    })
    conv.updatedAt = nowIso()
    conv.unread = conv.unread || {}
    conv.unread[user.id] = (conv.unread[user.id] || 0) + 1
    save()
  }, 1500)

  return message
})

route('POST', /^\/conversations\/([^/]+)\/read$/, (m) => {
  const user = requireUser()
  const conversation = db.conversations.find((c) => c.id === m[1])
  if (!conversation) fail(70001, '会话不存在')
  conversation.unread = conversation.unread || {}
  conversation.unread[user.id] = 0
  db.messages
    .filter((msg) => msg.conversationId === conversation.id && msg.senderId !== user.id)
    .forEach((msg) => {
      msg.status = 'READ'
    })
  save()
  return null
})

/* ---------- 通知 ---------- */

route('GET', /^\/notifications$/, (m, { query }) => {
  const user = requireUser()
  let list = db.notifications.filter((n) => n.userId === user.id)
  if (query.type) list = list.filter((n) => n.type === query.type)
  if (String(query.unreadOnly) === 'true') list = list.filter((n) => !n.read)
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return paginate(list.map((n) => clone(n)), query)
})

route('GET', /^\/notifications\/unread-count$/, () => {
  const user = requireUser()
  const list = db.notifications.filter((n) => n.userId === user.id && !n.read)
  const byType = {}
  for (const n of list) byType[n.type] = (byType[n.type] || 0) + 1
  return { total: list.length, byType }
})

route('POST', /^\/notifications\/read$/, (m, { data }) => {
  const user = requireUser()
  const ids = data.ids
  db.notifications
    .filter((n) => n.userId === user.id)
    .forEach((n) => {
      if (!ids || ids.includes(n.id)) n.read = true
    })
  save()
  return null
})

/* ---------- 系统 ---------- */

route('GET', /^\/system\/config$/, () => ({
  appVersion: { min: '1.0.0', latest: '1.3.2', downloadUrl: '#' },
  upload: { maxSizeMB: 5, maxImages: 9, accept: ['jpg', 'png', 'webp'] },
  payment: { channels: ['WECHAT', 'ALIPAY'], campusBalanceLimit: 20000 },
  order: { paymentTimeoutMinutes: 15, autoConfirmDays: 10, refundWindowDays: 7 },
  features: { chat: true, express: true, recommend: true },
  customerService: { qq: '123456789', workTime: '09:00-21:00' },
}))

route('GET', /^\/system\/health$/, () => ({ status: 'UP', components: { db: 'UP', redis: 'UP', mq: 'UP' } }))

/* ---------- 分发 ---------- */

function normalizeUrl(url) {
  return String(url || '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/v1/, '')
    .split('?')[0]
}

const delay = () => new Promise((r) => setTimeout(r, LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])))

export const isMockEnabled = String(import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'

/** axios 自定义 adapter */
export async function mockAdapter(config) {
  await delay()
  const method = String(config.method || 'get').toUpperCase()
  const url = normalizeUrl(config.url)
  const query = config.params || {}
  let data = config.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data || '{}')
    } catch {
      data = {}
    }
  }
  data = data || {}
  const headers = config.headers || {}

  const envelope = (payload) => ({
    data: {
      code: 0,
      message: 'ok',
      data: payload ?? null,
      requestId: uuid(),
      timestamp: Date.now(),
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  })

  const unauthorized = (token) => !token || !db.session || db.session.accessToken !== token

  try {
    // 公开接口白名单
    const publicPaths = ['/auth/login', '/auth/register', '/auth/sms-code', '/auth/login/sms', '/auth/token/refresh', '/auth/password/reset', '/categories', '/campuses', '/system/config', '/system/health']
    const isPublic = publicPaths.includes(url) || /^\/products(\/[^/]+)?$/.test(url) || /^\/products\/[^/]+\/reviews$/.test(url) || /^\/users\/[^/]+\/(products|reviews)$/.test(url) || /^\/users\/[^/]+$/.test(url) || url === '/products/recommended'

    if (!isPublic) {
      const rawAuth = typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization
      const token = String(rawAuth || '').replace(/^Bearer\s+/i, '')
      if (unauthorized(token)) {
        db.session = null
        save()
        fail(20001, '登录状态已失效，请重新登录')
      }
    }

    for (const { method: m, pattern, fn } of routes) {
      if (m !== method) continue
      const match = url.match(pattern)
      if (!match) continue
      const result = fn(match, { query, data, headers })
      save()
      return envelope(result)
    }

    fail(10006, `接口不存在：${method} ${url}`, 404)
  } catch (error) {
    if (error?.isApiError) {
      return {
        data: {
          code: error.code,
          message: error.message,
          data: null,
          requestId: uuid(),
          timestamp: Date.now(),
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      }
    }
    throw error
  }
}
