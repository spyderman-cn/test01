<template>
  <div class="page orders-page">
    <div class="container">
      <div class="page-head">
        <div>
          <h1>我的订单</h1>
          <p class="muted">共有 {{ total }} 笔订单</p>
        </div>
        <el-button-group>
          <el-button :type="role === 'buyer' ? 'primary' : 'default'" @click="switchRole('buyer')">
            我买到的
          </el-button>
          <el-button :type="role === 'seller' ? 'primary' : 'default'" @click="switchRole('seller')">
            我卖出的
          </el-button>
        </el-button-group>
      </div>

      <div class="status-chips">
        <button
          v-for="chip in statusChips"
          :key="chip.value"
          class="chip"
          :class="{ active: status === chip.value }"
          @click="switchStatus(chip.value)"
        >
          {{ chip.label }}
        </button>
      </div>

      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else>
        <div v-if="list.length" class="order-list">
          <article v-for="order in list" :key="order.id" class="order-card card">
            <header class="order-head">
              <span class="order-no">订单号 {{ order.orderNo }}</span>
              <span class="order-time">{{ dateTime(order.createdAt) }}</span>
              <StatusTag scope="order" :status="order.status" />
            </header>

            <div class="order-body" @click="goDetail(order)">
              <img class="thumb" :src="order.product?.cover" :alt="order.product?.title" />
              <div class="order-info">
                <h3 class="ellipsis-2">{{ order.product?.title }}</h3>
                <p class="muted">
                  {{ tradeTypeLabel(order.tradeType) }}
                  <template v-if="order.counterparty"> · {{ role === 'buyer' ? '卖家' : '买家' }} {{ order.counterparty.nickname }}</template>
                </p>
              </div>
              <div class="order-amount">
                <span class="price">{{ money(order.amount.payAmount) }}</span>
                <small v-if="order.amount.shippingFee">含运费 ¥{{ money(order.amount.shippingFee) }}</small>
              </div>
            </div>

            <footer class="order-foot">
              <el-button text size="small" @click="goDetail(order)">订单详情</el-button>
              <OrderActions :order="order" :role="role" @refresh="load" />
            </footer>
          </article>
        </div>
        <EmptyBox v-else description="还没有订单，去逛逛吧">
          <el-button type="primary" round @click="router.push({ name: 'products' })">去逛逛</el-button>
        </EmptyBox>

        <div v-if="total > pageSize" class="pager">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            @current-change="onPageChange"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listOrders } from '@/api/order'
import { tradeTypeLabel } from '@/utils/constants'
import { dateTime, money } from '@/utils/format'
import OrderActions from '@/components/OrderActions.vue'
import EmptyBox from '@/components/EmptyBox.vue'
import StatusTag from '@/components/StatusTag.vue'

const router = useRouter()

const role = ref('buyer')
const status = ref('')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 10
const loading = ref(true)

const statusChips = [
  { value: '', label: '全部' },
  { value: 'PENDING_PAYMENT', label: '待付款' },
  { value: 'PAID', label: '已付款' },
  { value: 'DELIVERING', label: '已发货' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'REFUNDING', label: '退款中' },
]

async function load() {
  loading.value = true
  try {
    const result = await listOrders({
      role: role.value,
      status: status.value || undefined,
      page: page.value,
      pageSize,
    })
    list.value = result.list
    total.value = result.total
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function switchRole(next) {
  if (role.value === next) return
  role.value = next
  page.value = 1
  load()
}

function switchStatus(next) {
  status.value = next
  page.value = 1
  load()
}

function onPageChange(next) {
  page.value = next
  load()
}

const goDetail = (order) => router.push({ name: 'order-detail', params: { id: order.id } })

onMounted(load)
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.page-head h1 {
  font-size: 26px;
  margin-bottom: 6px;
}

.status-chips {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink-500);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip:hover {
  border-color: #bfe6d7;
  color: var(--brand);
}

.chip.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.order-card {
  overflow: hidden;
}

.order-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  background: #fbfdfc;
  font-size: 12px;
  color: var(--ink-500);
}

.order-no {
  font-weight: 600;
  color: var(--ink-700);
}

.order-time {
  margin-right: auto;
}

.order-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  cursor: pointer;
}

.thumb {
  width: 84px;
  height: 84px;
  border-radius: 12px;
  object-fit: cover;
  background: #f2f5f4;
  flex-shrink: 0;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-info h3 {
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 6px;
}

.order-info p {
  font-size: 12px;
}

.order-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.order-amount .price {
  font-size: 19px;
}

.order-amount small {
  font-size: 11px;
  color: var(--ink-400);
}

.order-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px dashed var(--line);
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 26px;
}

@media (max-width: 640px) {
  .thumb {
    width: 64px;
    height: 64px;
  }
  .order-amount {
    display: none;
  }
}
</style>
