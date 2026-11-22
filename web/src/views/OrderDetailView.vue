<template>
  <div class="page order-detail-page">
    <div v-if="loading" class="container">
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else-if="order" class="container">
      <div class="page-head">
        <div>
          <el-button text @click="router.back()">
            <el-icon><ArrowLeft /></el-icon>返回
          </el-button>
          <h1>订单详情</h1>
        </div>
        <OrderActions :order="order" :role="role" @refresh="load" />
      </div>

      <!-- 状态 -->
      <section class="status-card card" :class="statusClass">
        <div class="status-main">
          <StatusTag scope="order" :status="order.status" size="large" />
          <div>
            <h2>{{ statusTitle }}</h2>
            <p class="muted">{{ statusDesc }}</p>
          </div>
        </div>
        <div class="status-meta">
          <span>订单号 {{ order.orderNo }}</span>
          <span>下单时间 {{ dateTime(order.createdAt) }}</span>
        </div>
      </section>

      <!-- 进度 -->
      <section v-if="showSteps" class="steps-card card">
        <el-steps :active="stepActive" finish-status="success" align-center>
          <el-step title="提交订单" :description="dateTime(order.timeline.createdAt)" />
          <el-step title="付款成功" :description="dateTime(order.timeline.paidAt)" />
          <el-step v-if="order.tradeType === 'EXPRESS'" title="卖家发货" :description="dateTime(order.timeline.shippedAt)" />
          <el-step v-else title="当面交易" :description="order.meetInfo?.place || '—'" />
          <el-step title="交易完成" :description="dateTime(order.timeline.completedAt)" />
        </el-steps>
      </section>

      <div class="detail-grid">
        <div class="left">
          <!-- 商品 -->
          <section class="card block">
            <h3 class="block-title">商品信息</h3>
            <div class="product-row clickable" @click="router.push({ name: 'product-detail', params: { id: order.product.id } })">
              <img :src="order.product.cover" :alt="order.product.title" />
              <div class="product-info">
                <strong>{{ order.product.title }}</strong>
                <span class="muted">{{ conditionLabel(order.product.condition) }}</span>
              </div>
              <span class="price">{{ money(order.product.price) }}</span>
            </div>
          </section>

          <!-- 交易信息 -->
          <section class="card block">
            <h3 class="block-title">交易信息</h3>
            <dl class="info-list">
              <div>
                <dt>交易方式</dt>
                <dd>{{ tradeTypeLabel(order.tradeType) }}</dd>
              </div>
              <div>
                <dt>{{ role === 'buyer' ? '卖家' : '买家' }}</dt>
                <dd>{{ role === 'buyer' ? order.seller?.nickname : order.buyer?.nickname }}</dd>
              </div>
              <template v-if="order.meetInfo">
                <div>
                  <dt>面交地点</dt>
                  <dd>{{ order.meetInfo.campus?.name }} · {{ order.meetInfo.place }}</dd>
                </div>
                <div v-if="order.meetInfo.expectTime">
                  <dt>期望时间</dt>
                  <dd>{{ dateTime(order.meetInfo.expectTime) }}</dd>
                </div>
              </template>
              <template v-if="order.address">
                <div>
                  <dt>收货地址</dt>
                  <dd>{{ order.address.detail }}（{{ order.address.receiver }} {{ order.address.phone }}）</dd>
                </div>
              </template>
              <template v-if="order.express">
                <div>
                  <dt>物流</dt>
                  <dd>{{ order.express.company }} · {{ order.express.trackingNo }}</dd>
                </div>
              </template>
              <div v-if="order.remark">
                <dt>买家留言</dt>
                <dd>{{ order.remark }}</dd>
              </div>
            </dl>
          </section>

          <!-- 时间线 -->
          <section class="card block">
            <h3 class="block-title">订单动态</h3>
            <el-timeline class="timeline">
              <el-timeline-item
                v-for="(log, index) in logs"
                :key="index"
                :timestamp="dateTime(log.createdAt)"
                :type="index === logs.length - 1 ? 'primary' : ''"
              >
                {{ log.remark }}
                <span class="muted"> · {{ log.operator === 'BUYER' ? '买家' : log.operator === 'SELLER' ? '卖家' : '系统' }}</span>
              </el-timeline-item>
            </el-timeline>
          </section>
        </div>

        <aside class="right">
          <section class="card block">
            <h3 class="block-title">金额明细</h3>
            <div class="amount-row"><span>商品金额</span><span>¥{{ money(order.amount.goodsAmount) }}</span></div>
            <div class="amount-row"><span>运费</span><span>¥{{ money(order.amount.shippingFee) }}</span></div>
            <div class="amount-row"><span>优惠</span><span>-¥{{ money(order.amount.discount) }}</span></div>
            <div class="amount-row total"><span>实付</span><span class="price">{{ money(order.amount.payAmount) }}</span></div>
            <div v-if="order.payment" class="pay-meta">
              <el-icon><Wallet /></el-icon>
              {{ order.payment.channel === 'WECHAT' ? '微信支付' : '支付宝' }} · 已支付
            </div>
          </section>

          <section class="card block tips">
            <h3 class="block-title">温馨提示</h3>
            <p>面交时请当面验货，确认无误后再点击「确认收货」。</p>
            <p>如商品与描述不符，可在完成交易后 7 天内申请退款。</p>
            <p>交易过程中请勿脱离平台私下转账。</p>
          </section>
        </aside>
      </div>
    </div>

    <div v-else class="container">
      <EmptyBox description="订单不存在或无权查看">
        <el-button round @click="router.push({ name: 'orders' })">返回订单列表</el-button>
      </EmptyBox>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrder, getOrderLogs } from '@/api/order'
import { useUserStore } from '@/stores/user'
import { conditionLabel, orderStatus, tradeTypeLabel } from '@/utils/constants'
import { dateTime, money } from '@/utils/format'
import OrderActions from '@/components/OrderActions.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyBox from '@/components/EmptyBox.vue'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const order = ref(null)
const logs = ref([])
const loading = ref(true)

const role = computed(() => (order.value?.buyer?.id === user.profile?.id ? 'buyer' : 'seller'))

const statusTitle = computed(() => (order.value ? orderStatus(order.value.status).label : ''))
const statusDesc = computed(() => {
  const status = order.value?.status
  const map = {
    PENDING_PAYMENT: '请在 15 分钟内完成付款，超时订单将自动取消。',
    PAID: order.value?.tradeType === 'EXPRESS' ? '买家已付款，等待卖家发货。' : '买家已付款，请按约定完成面交。',
    DELIVERING: '卖家已发货，收到商品后请确认收货。',
    COMPLETED: '交易已完成，欢迎给对方一个评价。',
    CANCELLED: '订单已取消，商品已重新上架。',
    REFUNDING: '买家申请了退款，等待卖家处理。',
    REFUNDED: '退款已完成，款项将原路退回。',
  }
  return map[status] || ''
})

const statusClass = computed(() => {
  const map = {
    COMPLETED: 'is-success',
    CANCELLED: 'is-muted',
    REFUNDED: 'is-muted',
    REFUNDING: 'is-danger',
  }
  return map[order.value?.status] || 'is-active'
})

const showSteps = computed(() => order.value && !['CANCELLED', 'REFUNDED'].includes(order.value.status))

const stepActive = computed(() => {
  const map = { PENDING_PAYMENT: 1, PAID: 2, DELIVERING: 3, COMPLETED: 4, REFUNDING: 2 }
  return map[order.value?.status] || 1
})

async function load() {
  loading.value = true
  try {
    order.value = await getOrder(route.params.id)
    logs.value = await getOrderLogs(route.params.id)
  } catch {
    order.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await user.fetchProfile()
  await load()
})
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.page-head h1 {
  font-size: 24px;
  margin-top: 4px;
}

.status-card {
  padding: 22px 24px;
  margin-bottom: 16px;
  border-left: 4px solid var(--brand);
}

.status-card.is-success {
  border-left-color: var(--brand);
}

.status-card.is-muted {
  border-left-color: var(--ink-400);
}

.status-card.is-danger {
  border-left-color: var(--el-color-danger);
}

.status-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-main h2 {
  font-size: 19px;
  margin-bottom: 4px;
}

.status-meta {
  display: flex;
  gap: 22px;
  margin-top: 14px;
  font-size: 12px;
  color: var(--ink-500);
}

.steps-card {
  padding: 22px 20px 14px;
  margin-bottom: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.left,
.right {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block {
  padding: 20px 22px;
}

.block-title {
  font-size: 15px;
  margin-bottom: 14px;
}

.product-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.product-row img {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: cover;
  background: #f2f5f4;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-info strong {
  font-size: 14px;
  line-height: 1.5;
}

.product-info span {
  font-size: 12px;
}

.info-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-list div {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

.info-list dt {
  width: 76px;
  color: var(--ink-500);
  flex-shrink: 0;
}

.info-list dd {
  margin: 0;
  color: var(--ink-900);
  line-height: 1.6;
}

.timeline {
  padding-left: 4px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--ink-700);
  padding: 6px 0;
}

.amount-row.total {
  border-top: 1px dashed var(--line);
  margin-top: 6px;
  padding-top: 12px;
  font-weight: 600;
}

.amount-row.total .price {
  font-size: 20px;
}

.pay-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
  color: var(--ink-500);
}

.tips p {
  font-size: 12px;
  color: var(--ink-500);
  line-height: 1.8;
}

.tips p + p {
  margin-top: 8px;
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
