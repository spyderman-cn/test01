<template>
  <div class="page detail-page">
    <div v-if="loading" class="container">
      <el-skeleton :rows="10" animated />
    </div>

    <div v-else-if="product" class="container">
      <el-breadcrumb separator="/" class="crumb">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'products' }">全部商品</el-breadcrumb-item>
        <el-breadcrumb-item>{{ product.categoryPath?.join(' / ') }}</el-breadcrumb-item>
      </el-breadcrumb>

      <div class="detail-grid">
        <!-- 图集 -->
        <section class="gallery card">
          <div class="main-image">
            <img :src="product.images[activeImage]" :alt="product.title" />
            <StatusTag v-if="product.status !== 'ON_SALE'" :status="product.status" class="corner-tag" />
          </div>
          <div class="thumbs">
            <button
              v-for="(image, index) in product.images"
              :key="index"
              class="thumb"
              :class="{ active: index === activeImage }"
              @click="activeImage = index"
            >
              <img :src="image" :alt="`图 ${index + 1}`" />
            </button>
          </div>
        </section>

        <!-- 信息 -->
        <section class="info">
          <div class="info-card card">
            <h1 class="title">{{ product.title }}</h1>
            <div class="price-line">
              <span class="price big">{{ money(product.price) }}</span>
              <span v-if="product.originalPrice" class="price-old">原价 ¥{{ money(product.originalPrice) }}</span>
              <span v-if="product.negotiable" class="nego">可小刀</span>
            </div>

            <div class="chips">
              <el-tag effect="plain" round>{{ conditionLabel(product.condition) }}</el-tag>
              <el-tag effect="plain" round type="success" v-for="t in product.tradeTypes" :key="t">
                {{ tradeTypeLabel(t) }}
              </el-tag>
              <el-tag v-for="tag in product.tags" :key="tag" effect="plain" round type="info">{{ tag }}</el-tag>
            </div>

            <div class="meta-list">
              <div class="meta-item">
                <el-icon><Location /></el-icon>
                <span>{{ product.campus?.name }} · {{ product.meetPlace }}</span>
              </div>
              <div class="meta-item">
                <el-icon><View /></el-icon>
                <span>{{ product.stats.views }} 浏览 · {{ product.stats.favorites }} 收藏 · {{ product.stats.chats }} 人聊过</span>
              </div>
              <div class="meta-item">
                <el-icon><Clock /></el-icon>
                <span>发布于 {{ fromNow(product.createdAt) }}</span>
              </div>
            </div>

            <div class="actions" v-if="!isOwner">
              <el-button
                type="primary"
                size="large"
                class="buy-btn"
                :disabled="!product.canBuy"
                @click="openBuy"
              >
                {{ buyButtonText }}
              </el-button>
              <el-button size="large" @click="goChat">
                <el-icon><ChatDotRound /></el-icon>聊一聊
              </el-button>
              <el-button size="large" :type="product.favorited ? 'danger' : 'default'" plain @click="toggleFavorite">
                <el-icon><StarFilled v-if="product.favorited" /><Star v-else /></el-icon>
                {{ product.favorited ? '已收藏' : '收藏' }}
              </el-button>
            </div>

            <div class="actions" v-else>
              <el-button v-if="product.status === 'ON_SALE'" size="large" @click="changeStatus('OFF_SHELF')">
                下架商品
              </el-button>
              <el-button v-if="product.status === 'OFF_SHELF'" type="primary" size="large" @click="changeStatus('ON_SALE')">
                重新上架
              </el-button>
              <el-button v-if="product.status === 'ON_SALE'" size="large" @click="changeStatus('SOLD')">
                标记已售出
              </el-button>
              <el-button size="large" type="danger" plain @click="removeProduct">删除</el-button>
            </div>

            <p v-if="!product.canBuy && !isOwner" class="buy-hint">
              {{ canBuyHint }}
            </p>
          </div>

          <!-- 卖家 -->
          <div class="seller-card card">
            <el-avatar :size="46" :src="product.seller?.avatar">{{ product.seller?.nickname?.[0] }}</el-avatar>
            <div class="seller-info">
              <div class="name-row">
                <strong>{{ product.seller?.nickname }}</strong>
                <el-icon v-if="product.seller?.verified" class="verified"><CircleCheckFilled /></el-icon>
              </div>
              <div class="seller-meta">
                <span>信用分 {{ product.seller?.creditScore }}</span>
                <span>已成交 {{ product.seller?.soldCount }} 笔</span>
              </div>
            </div>
            <el-button text @click="router.push({ name: 'products', query: { sellerId: product.seller.id } })">
              查看 TA 的闲置 →
            </el-button>
          </div>

          <div class="report-row">
            <el-button text size="small" @click="openReport">
              <el-icon><Warning /></el-icon>举报该商品
            </el-button>
          </div>
        </section>
      </div>

      <!-- 描述 -->
      <section class="desc-card card">
        <h2>商品描述</h2>
        <p>{{ product.description }}</p>
        <div class="desc-meta">
          <span>分类：{{ product.categoryPath?.join(' / ') }}</span>
          <span v-if="product.shippingFee">邮寄运费：¥{{ money(product.shippingFee) }}</span>
        </div>
      </section>

      <!-- 相似 -->
      <section v-if="similar.length" class="similar">
        <div class="section-title">
          <h2>相似闲置</h2>
        </div>
        <div class="grid-products">
          <ProductCard v-for="item in similar" :key="item.id" :product="item" />
        </div>
      </section>
    </div>

    <div v-else class="container">
      <EmptyBox description="商品不存在、已下架，或你无权查看">
        <el-button round @click="router.push({ name: 'products' })">返回商品列表</el-button>
      </EmptyBox>
    </div>

    <!-- 购买弹窗 -->
    <el-dialog v-model="buyVisible" title="确认订单" width="520px" :close-on-click-modal="false">
      <div v-if="product" class="buy-dialog">
        <div class="buy-product">
          <img :src="product.images[0]" :alt="product.title" />
          <div>
            <strong class="ellipsis-2">{{ product.title }}</strong>
            <span class="price">{{ money(product.price) }}</span>
          </div>
        </div>

        <el-form label-position="top">
          <el-form-item label="交易方式">
            <el-radio-group v-model="buyForm.tradeType">
              <el-radio-button v-for="t in product.tradeTypes" :key="t" :value="t">
                {{ tradeTypeLabel(t) }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>

          <template v-if="buyForm.tradeType === 'MEET'">
            <el-form-item label="面交地点" required>
              <el-input v-model="buyForm.place" placeholder="例如：图书馆南门" />
            </el-form-item>
            <el-form-item label="期望时间">
              <el-date-picker
                v-model="buyForm.expectTime"
                type="datetime"
                placeholder="选填，方便对方安排"
                style="width: 100%"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
              />
            </el-form-item>
          </template>

          <el-form-item v-if="buyForm.tradeType === 'EXPRESS'" label="收货地址" required>
            <el-input v-model="buyForm.address" type="textarea" :rows="2" placeholder="宿舍楼 + 门牌号 + 联系方式" />
          </el-form-item>

          <el-form-item label="给卖家留言">
            <el-input v-model="buyForm.remark" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="选填" />
          </el-form-item>
        </el-form>

        <div class="summary">
          <span>应付金额</span>
          <strong class="price">{{ money(payAmount) }}</strong>
        </div>
      </div>
      <template #footer>
        <el-button @click="buyVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitOrder">提交订单</el-button>
      </template>
    </el-dialog>

    <!-- 举报弹窗 -->
    <el-dialog v-model="reportVisible" title="举报商品" width="460px">
      <el-form label-position="top">
        <el-form-item label="举报类型">
          <el-select v-model="reportForm.type" style="width: 100%">
            <el-option v-for="t in REPORT_TYPES" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input v-model="reportForm.description" type="textarea" :rows="3" placeholder="请描述具体问题，便于我们核实" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reportVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReport">提交举报</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  changeProductStatus,
  deleteProduct,
  favoriteProduct,
  getProduct,
  listProducts,
  unfavoriteProduct,
} from '@/api/product'
import { createConversation } from '@/api/chat'
import { createOrder } from '@/api/order'
import { createReport } from '@/api/report'
import { useUserStore } from '@/stores/user'
import { conditionLabel, tradeTypeLabel, REPORT_TYPES } from '@/utils/constants'
import { fromNow, money } from '@/utils/format'
import ProductCard from '@/components/ProductCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyBox from '@/components/EmptyBox.vue'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const product = ref(null)
const similar = ref([])
const loading = ref(true)
const activeImage = ref(0)
const buyVisible = ref(false)
const reportVisible = ref(false)
const submitting = ref(false)

const buyForm = reactive({ tradeType: 'MEET', place: '', expectTime: '', address: '', remark: '' })
const reportForm = reactive({ type: 'FAKE', description: '' })

const isOwner = computed(() => user.profile?.id && product.value?.seller?.id === user.profile.id)

const buyButtonText = computed(() => {
  if (isOwner.value) return '管理商品'
  if (product.value?.status === 'RESERVED') return '已被预订'
  if (product.value?.status === 'SOLD') return '已售出'
  if (!user.isLoggedIn) return '登录后购买'
  return '立即购买'
})

const canBuyHint = computed(() => {
  if (!product.value) return ''
  if (!user.isLoggedIn) return '登录并完成学生认证后即可下单'
  if (!user.isVerified) return '完成学生认证后才可以下单'
  if (product.value.status === 'RESERVED') return '该商品已有买家下单，暂时无法购买'
  if (product.value.status === 'SOLD') return '该商品已售出'
  return '当前商品暂不可购买'
})

const payAmount = computed(() => {
  if (!product.value) return 0
  return product.value.price + (buyForm.tradeType === 'EXPRESS' ? product.value.shippingFee : 0)
})

async function load() {
  loading.value = true
  try {
    product.value = await getProduct(route.params.id)
    buyForm.tradeType = product.value.tradeTypes[0]
    buyForm.place = product.value.meetPlace || ''
    const res = await listProducts({ categoryId: product.value.categoryId, pageSize: 4, sort: 'hot' })
    similar.value = res.list.filter((item) => item.id !== product.value.id).slice(0, 4)
  } catch {
    product.value = null
  } finally {
    loading.value = false
  }
}

const ensureLogin = () => {
  if (user.isLoggedIn) return true
  router.push({ name: 'login', query: { redirect: route.fullPath } })
  return false
}

function openBuy() {
  if (isOwner.value) return
  if (!ensureLogin()) return
  if (!user.isVerified) {
    ElMessage.warning('请先完成学生认证')
    router.push({ name: 'profile' })
    return
  }
  buyVisible.value = true
}

async function submitOrder() {
  if (buyForm.tradeType === 'MEET' && !buyForm.place) {
    ElMessage.warning('请填写面交地点')
    return
  }
  if (buyForm.tradeType === 'EXPRESS' && !buyForm.address) {
    ElMessage.warning('请填写收货地址')
    return
  }
  submitting.value = true
  try {
    const order = await createOrder({
      productId: product.value.id,
      tradeType: buyForm.tradeType,
      meetInfo: buyForm.tradeType === 'MEET' ? { campusId: product.value.campus.id, place: buyForm.place, expectTime: buyForm.expectTime || undefined } : undefined,
      address: buyForm.address || undefined,
      remark: buyForm.remark || undefined,
    })
    buyVisible.value = false
    ElMessage.success('下单成功，请在 15 分钟内完成付款')
    router.push({ name: 'order-detail', params: { id: order.id } })
  } finally {
    submitting.value = false
  }
}

async function toggleFavorite() {
  if (!ensureLogin()) return
  try {
    if (product.value.favorited) {
      await unfavoriteProduct(product.value.id)
      product.value.favorited = false
      product.value.stats.favorites = Math.max(0, product.value.stats.favorites - 1)
    } else {
      await favoriteProduct(product.value.id)
      product.value.favorited = true
      product.value.stats.favorites += 1
    }
  } catch {
    /* 已由拦截器提示 */
  }
}

async function goChat() {
  if (!ensureLogin()) return
  const conversation = await createConversation({
    targetUserId: product.value.seller.id,
    productId: product.value.id,
  })
  router.push({ name: 'chat-detail', params: { id: conversation.id } })
}

async function changeStatus(action) {
  const labels = { OFF_SHELF: '下架', ON_SALE: '重新上架', SOLD: '标记已售出' }
  try {
    await ElMessageBox.confirm(`确定${labels[action]}该商品吗？`, '提示', { type: 'warning' })
    product.value = await changeProductStatus(product.value.id, { action })
    ElMessage.success('操作成功')
  } catch {
    /* 取消 */
  }
}

async function removeProduct() {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定删除吗？', '删除商品', { type: 'warning' })
    await deleteProduct(product.value.id)
    ElMessage.success('已删除')
    router.push({ name: 'products' })
  } catch {
    /* 取消 */
  }
}

function openReport() {
  if (!ensureLogin()) return
  reportForm.type = 'FAKE'
  reportForm.description = ''
  reportVisible.value = true
}

function submitReport() {
  createReport({
    targetType: 'PRODUCT',
    targetId: product.value.id,
    type: reportForm.type,
    description: reportForm.description,
  })
    .then(() => {
      reportVisible.value = false
      ElMessage.success('举报已提交，我们会在 48 小时内处理')
    })
    .catch(() => {
      /* 拦截器已提示 */
    })
}

watch(() => route.params.id, load)
onMounted(load)
</script>

<style scoped>
.crumb {
  margin-bottom: 18px;
  font-size: 13px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 22px;
  align-items: start;
}

.gallery {
  padding: 14px;
  position: sticky;
  top: 88px;
}

.main-image {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #f2f5f4;
  aspect-ratio: 4 / 3;
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.corner-tag {
  position: absolute;
  left: 12px;
  top: 12px;
}

.thumbs {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.thumb {
  width: 72px;
  height: 72px;
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  background: #f2f5f4;
  transition: border-color 0.15s ease;
}

.thumb.active {
  border-color: var(--brand);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-card {
  padding: 24px;
}

.title {
  font-size: 24px;
  line-height: 1.4;
  margin-bottom: 14px;
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}

.price.big {
  font-size: 34px;
}

.nego {
  font-size: 12px;
  color: var(--brand-dark);
  background: var(--brand-50);
  border-radius: 999px;
  padding: 3px 10px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0;
  border-top: 1px dashed var(--line);
  border-bottom: 1px dashed var(--line);
  color: var(--ink-500);
  font-size: 13px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}

.buy-btn {
  flex: 1;
  min-width: 160px;
  font-weight: 600;
}

.buy-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--ink-400);
}

.seller-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.seller-info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.verified {
  color: var(--brand);
  font-size: 14px;
}

.seller-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--ink-500);
  margin-top: 3px;
}

.report-row {
  display: flex;
  justify-content: flex-end;
  color: var(--ink-400);
}

.desc-card {
  margin-top: 24px;
  padding: 24px;
}

.desc-card h2 {
  font-size: 17px;
  margin-bottom: 12px;
}

.desc-card p {
  color: var(--ink-700);
  line-height: 1.9;
  white-space: pre-wrap;
}

.desc-meta {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  color: var(--ink-500);
}

.similar {
  margin-top: 34px;
}

.buy-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.buy-product {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f7faf9;
  border-radius: 12px;
}

.buy-product img {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
}

.buy-product div {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--brand-50);
  border-radius: 12px;
}

.summary .price {
  font-size: 22px;
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .gallery {
    position: static;
  }
}
</style>
