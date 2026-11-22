<template>
  <div class="order-actions">
    <template v-if="role === 'buyer'">
      <template v-if="order.status === 'PENDING_PAYMENT'">
        <el-button type="primary" round size="small" @click="payVisible = true">去支付</el-button>
        <el-button text size="small" @click="cancel">取消订单</el-button>
      </template>
      <template v-else-if="order.status === 'PAID'">
        <el-button v-if="order.tradeType !== 'EXPRESS'" type="primary" round size="small" @click="confirm">
          确认收货
        </el-button>
        <span v-else class="hint">等待卖家发货</span>
      </template>
      <el-button v-else-if="order.status === 'DELIVERING'" type="primary" round size="small" @click="confirm">
        确认收货
      </el-button>
      <el-button
        v-else-if="order.status === 'COMPLETED' && !order.reviewed?.buyer"
        round
        size="small"
        @click="openReview"
      >
        评价
      </el-button>
      <span v-else-if="order.status === 'REFUNDING'" class="hint">退款处理中</span>
      <span v-else-if="order.status === 'REFUNDED'" class="hint">已退款</span>
    </template>

    <template v-else>
      <el-button
        v-if="order.status === 'PAID' && order.tradeType === 'EXPRESS'"
        type="primary"
        round
        size="small"
        @click="shipVisible = true"
      >
        发货
      </el-button>
      <el-button v-else-if="order.status === 'REFUNDING'" type="danger" round size="small" @click="handleRefund">
        处理退款
      </el-button>
      <el-button
        v-else-if="order.status === 'COMPLETED' && !order.reviewed?.seller"
        round
        size="small"
        @click="openReview"
      >
        评价买家
      </el-button>
      <span v-else-if="order.status === 'PENDING_PAYMENT'" class="hint">等待买家付款</span>
      <span v-else-if="order.status === 'PAID'" class="hint">等待买家确认</span>
      <span v-else-if="order.status === 'DELIVERING'" class="hint">等待买家收货</span>
    </template>

    <!-- 支付 -->
    <el-dialog v-model="payVisible" title="收银台" width="420px">
      <div class="pay-box">
        <p class="pay-amount">¥{{ money(order.amount?.payAmount) }}</p>
        <p class="muted small">订单 {{ order.orderNo }}</p>
        <el-radio-group v-model="channel" class="pay-channels">
          <el-radio-button value="WECHAT">微信支付</el-radio-button>
          <el-radio-button value="ALIPAY">支付宝</el-radio-button>
        </el-radio-group>
        <p class="muted small">演示环境会直接判定支付成功</p>
      </div>
      <template #footer>
        <el-button @click="payVisible = false">取消</el-button>
        <el-button type="primary" :loading="paying" @click="doPay">确认支付</el-button>
      </template>
    </el-dialog>

    <!-- 发货 -->
    <el-dialog v-model="shipVisible" title="填写物流信息" width="420px">
      <el-form label-position="top">
        <el-form-item label="物流公司">
          <el-input v-model="shipForm.company" placeholder="例如：顺丰" />
        </el-form-item>
        <el-form-item label="运单号">
          <el-input v-model="shipForm.trackingNo" placeholder="例如：SF1234567890" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" @click="doShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 评价 -->
    <el-dialog v-model="reviewVisible" title="发表评价" width="460px">
      <div class="review-box">
        <el-rate v-model="reviewForm.rating" show-text :texts="['很不满意', '不满意', '一般', '满意', '非常满意']" />
        <el-checkbox-group v-model="reviewForm.tags" class="review-tags">
          <el-checkbox-button v-for="tag in REVIEW_TAGS" :key="tag" :value="tag">{{ tag }}</el-checkbox-button>
        </el-checkbox-group>
        <el-input
          v-model="reviewForm.content"
          type="textarea"
          :rows="3"
          maxlength="300"
          show-word-limit
          placeholder="说说这次交易体验（选填）"
        />
        <el-checkbox v-model="reviewForm.anonymous">匿名评价</el-checkbox>
      </div>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" @click="doReview">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { cancelOrder, confirmOrder, createPayment, createReview, handleRefund as apiHandleRefund, shipOrder } from '@/api/order'
import { REVIEW_TAGS } from '@/utils/constants'
import { money } from '@/utils/format'

const props = defineProps({
  order: { type: Object, required: true },
  role: { type: String, default: 'buyer' },
})

const emit = defineEmits(['refresh'])

const payVisible = ref(false)
const shipVisible = ref(false)
const reviewVisible = ref(false)
const paying = ref(false)
const channel = ref('WECHAT')

const shipForm = reactive({ company: '顺丰', trackingNo: '' })
const reviewForm = reactive({ rating: 5, tags: [], content: '', anonymous: false })

const done = (message) => {
  ElMessage.success(message)
  emit('refresh')
}

async function doPay() {
  paying.value = true
  try {
    await createPayment({ orderId: props.order.id, channel: channel.value })
    payVisible.value = false
    done('支付成功')
  } finally {
    paying.value = false
  }
}

async function cancel() {
  try {
    await ElMessageBox.confirm('取消后商品会重新上架，确定取消吗？', '取消订单', { type: 'warning' })
    await cancelOrder(props.order.id, { reason: '买家主动取消' })
    done('订单已取消')
  } catch {
    /* 取消 */
  }
}

async function confirm() {
  try {
    await ElMessageBox.confirm('确认已经收到商品并完成交易吗？', '确认收货', { type: 'warning' })
    await confirmOrder(props.order.id)
    done('交易完成')
  } catch {
    /* 取消 */
  }
}

async function doShip() {
  if (!shipForm.trackingNo) {
    ElMessage.warning('请填写运单号')
    return
  }
  await shipOrder(props.order.id, { ...shipForm })
  shipVisible.value = false
  done('已发货')
}

function openReview() {
  reviewForm.rating = 5
  reviewForm.tags = []
  reviewForm.content = ''
  reviewForm.anonymous = false
  reviewVisible.value = true
}

async function doReview() {
  await createReview(props.order.id, { ...reviewForm })
  reviewVisible.value = false
  done('评价成功')
}

async function handleRefund() {
  try {
    const action = await ElMessageBox.confirm('同意退款将原路退回买家，是否同意？', '处理退款', {
      confirmButtonText: '同意退款',
      cancelButtonText: '拒绝',
      distinguishCancelAndClose: true,
      type: 'warning',
    })
    if (action === 'confirm') {
      await apiHandleRefund(props.order.id, { action: 'AGREE' })
      done('已同意退款')
    }
  } catch (error) {
    if (error === 'cancel') {
      try {
        const { value } = await ElMessageBox.prompt('请填写拒绝原因', '拒绝退款', {
          inputPlaceholder: '例如：商品已按描述交付，无质量问题',
          inputValidator: (v) => (v ? true : '请填写原因'),
        })
        const refundId = props.order.refundId || props.order.id
        await apiHandleRefund(refundId, { action: 'REJECT', rejectReason: value })
        done('已拒绝退款')
      } catch {
        /* 取消 */
      }
    }
  }
}
</script>

<style scoped>
.order-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hint {
  font-size: 12px;
  color: var(--ink-400);
}

.pay-box {
  text-align: center;
}

.pay-amount {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 4px;
}

.small {
  font-size: 12px;
}

.pay-channels {
  margin: 18px 0 14px;
}

.review-box {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
