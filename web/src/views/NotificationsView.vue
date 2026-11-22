<template>
  <div class="page notifications-page">
    <div class="container narrow">
      <div class="page-head">
        <div>
          <h1>通知</h1>
          <p class="muted">{{ unread }} 条未读</p>
        </div>
        <el-button text :disabled="!unread" @click="markAll">全部已读</el-button>
      </div>

      <div class="type-chips">
        <button
          v-for="chip in typeChips"
          :key="chip.value"
          class="chip"
          :class="{ active: type === chip.value }"
          @click="switchType(chip.value)"
        >
          {{ chip.label }}
        </button>
      </div>

      <el-skeleton v-if="loading" :rows="4" animated />
      <template v-else>
        <div v-if="list.length" class="notice-list">
          <article
            v-for="item in list"
            :key="item.id"
            class="notice card"
            :class="{ unread: !item.read }"
            @click="open(item)"
          >
            <span class="dot" v-if="!item.read" />
            <div class="notice-body">
              <div class="notice-top">
                <strong>{{ item.title }}</strong>
                <span class="time">{{ fromNow(item.createdAt) }}</span>
              </div>
              <p>{{ item.content }}</p>
            </div>
            <el-icon class="arrow"><ArrowRight /></el-icon>
          </article>
        </div>
        <EmptyBox v-else description="暂时没有通知" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listNotifications, readNotifications } from '@/api/notification'
import { useUserStore } from '@/stores/user'
import { fromNow } from '@/utils/format'
import EmptyBox from '@/components/EmptyBox.vue'

const router = useRouter()
const user = useUserStore()

const list = ref([])
const unread = ref(0)
const type = ref('')
const loading = ref(true)

const typeChips = [
  { value: '', label: '全部' },
  { value: 'ORDER', label: '订单' },
  { value: 'PAYMENT', label: '支付' },
  { value: 'PRODUCT', label: '商品' },
  { value: 'SYSTEM', label: '系统' },
]

async function load() {
  loading.value = true
  try {
    const result = await listNotifications({ page: 1, pageSize: 50, type: type.value || undefined })
    list.value = result.list
    unread.value = result.list.filter((n) => !n.read).length
  } catch {
    list.value = []
    unread.value = 0
  } finally {
    loading.value = false
  }
}

function switchType(next) {
  type.value = next
  load()
}

async function markAll() {
  await readNotifications({})
  list.value.forEach((n) => (n.read = true))
  unread.value = 0
  user.fetchUnread()
}

async function open(item) {
  if (!item.read) {
    await readNotifications({ ids: [item.id] })
    item.read = true
    unread.value = Math.max(0, unread.value - 1)
    user.fetchUnread()
  }
  const payload = item.payload || {}
  if (payload.orderId) router.push({ name: 'order-detail', params: { id: payload.orderId } })
  else if (payload.productId) router.push({ name: 'product-detail', params: { id: payload.productId } })
}

onMounted(load)
</script>

<style scoped>
.narrow {
  max-width: 820px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-head h1 {
  font-size: 26px;
  margin-bottom: 4px;
}

.type-chips {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.chip {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink-500);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}

.chip.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.notice:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.notice.unread {
  border-left: 3px solid var(--brand);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
  flex-shrink: 0;
}

.notice-body {
  flex: 1;
  min-width: 0;
}

.notice-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 5px;
}

.notice-top strong {
  font-size: 14px;
}

.time {
  font-size: 11px;
  color: var(--ink-400);
  flex-shrink: 0;
}

.notice p {
  font-size: 13px;
  color: var(--ink-500);
  line-height: 1.6;
}

.arrow {
  color: var(--ink-300);
}
</style>
