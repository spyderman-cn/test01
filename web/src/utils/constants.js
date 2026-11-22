/** 与接口文档保持一致的枚举字典 */

export const CONDITIONS = [
  { value: 1, label: '全新' },
  { value: 2, label: '几乎全新' },
  { value: 3, label: '轻微使用痕迹' },
  { value: 4, label: '明显使用痕迹' },
  { value: 5, label: '功能正常外观破损' },
]

export const TRADE_TYPES = [
  { value: 'MEET', label: '校内面交', desc: '约在校内地点当面交易' },
  { value: 'SELF_PICKUP', label: '自提', desc: '到约定位置取货' },
  { value: 'EXPRESS', label: '快递', desc: '卖家发货，运费另计' },
]

export const PRODUCT_STATUS = {
  DRAFT: { label: '草稿', type: 'info' },
  PENDING: { label: '待审核', type: 'warning' },
  REJECTED: { label: '审核未通过', type: 'danger' },
  ON_SALE: { label: '在售', type: 'success' },
  RESERVED: { label: '已预订', type: 'warning' },
  SOLD: { label: '已售出', type: 'info' },
  OFF_SHELF: { label: '已下架', type: 'info' },
}

export const ORDER_STATUS = {
  PENDING_PAYMENT: { label: '待付款', type: 'warning' },
  PAID: { label: '已付款', type: 'primary' },
  DELIVERING: { label: '已发货', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'info' },
  REFUNDING: { label: '退款中', type: 'danger' },
  REFUNDED: { label: '已退款', type: 'info' },
}

export const NOTIFY_TYPES = [
  { value: 'ORDER', label: '订单' },
  { value: 'PAYMENT', label: '支付' },
  { value: 'PRODUCT', label: '商品' },
  { value: 'REVIEW', label: '评价' },
  { value: 'REPORT', label: '举报' },
  { value: 'SYSTEM', label: '系统' },
]

export const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'hot', label: '最热' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
]

export const REPORT_TYPES = [
  { value: 'FAKE', label: '虚假信息' },
  { value: 'PROHIBITED', label: '违禁物品' },
  { value: 'FRAUD', label: '涉嫌欺诈' },
  { value: 'ABUSE', label: '辱骂攻击' },
  { value: 'SPAM', label: '垃圾广告' },
  { value: 'OTHER', label: '其他' },
]

export const REVIEW_TAGS = ['描述相符', '按时面交', '态度友好', '包装仔细', '回复及时', '略有瑕疵']

export const conditionLabel = (v) => CONDITIONS.find((i) => i.value === v)?.label || '—'
export const tradeTypeLabel = (v) => TRADE_TYPES.find((i) => i.value === v)?.label || '—'
export const productStatus = (v) => PRODUCT_STATUS[v] || { label: v, type: 'info' }
export const orderStatus = (v) => ORDER_STATUS[v] || { label: v, type: 'info' }
