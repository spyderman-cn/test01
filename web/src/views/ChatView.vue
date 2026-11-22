<template>
  <div class="page chat-page">
    <div class="container">
      <div class="chat-shell card">
        <!-- 会话列表 -->
        <aside class="conv-list">
          <div class="conv-head">
            <h2>消息</h2>
            <span class="muted">{{ conversations.length }} 个会话</span>
          </div>
          <div class="conv-scroll">
            <button
              v-for="conv in conversations"
              :key="conv.id"
              class="conv-item"
              :class="{ active: conv.id === activeId }"
              @click="selectConversation(conv.id)"
            >
              <el-badge :value="conv.unreadCount" :hidden="!conv.unreadCount" :max="99">
                <el-avatar :size="40" :src="conv.targetUser?.avatar">
                  {{ conv.targetUser?.nickname?.[0] }}
                </el-avatar>
              </el-badge>
              <div class="conv-body">
                <div class="conv-top">
                  <strong class="ellipsis">{{ conv.targetUser?.nickname }}</strong>
                  <span class="time">{{ fromNow(conv.updatedAt) }}</span>
                </div>
                <p class="conv-msg ellipsis">{{ conv.lastMessage?.content || '开始聊天吧' }}</p>
              </div>
            </button>
            <EmptyBox v-if="!loading && !conversations.length" description="还没有聊天">
              <el-button type="primary" round @click="router.push({ name: 'products' })">去逛逛</el-button>
            </EmptyBox>
          </div>
        </aside>

        <!-- 聊天窗口 -->
        <section v-if="activeConversation" class="chat-panel">
          <header class="chat-head">
            <div class="peer">
              <el-avatar :size="34" :src="activeConversation.targetUser?.avatar">
                {{ activeConversation.targetUser?.nickname?.[0] }}
              </el-avatar>
              <div>
                <strong>{{ activeConversation.targetUser?.nickname }}</strong>
                <span class="muted">信用分 {{ activeConversation.targetUser?.creditScore }}</span>
              </div>
            </div>
            <div
              v-if="activeConversation.product"
              class="product-chip"
              @click="router.push({ name: 'product-detail', params: { id: activeConversation.product.id } })"
            >
              <img :src="activeConversation.product.cover" :alt="activeConversation.product.title" />
              <div>
                <span class="ellipsis">{{ activeConversation.product.title }}</span>
                <strong class="price">{{ money(activeConversation.product.price) }}</strong>
              </div>
            </div>
          </header>

          <div ref="scrollRef" class="messages">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message"
              :class="{ mine: msg.senderId === user.profile?.id }"
            >
              <el-avatar v-if="msg.senderId !== user.profile?.id" :size="32" :src="activeConversation.targetUser?.avatar">
                {{ activeConversation.targetUser?.nickname?.[0] }}
              </el-avatar>
              <div class="bubble-wrap">
                <div class="bubble">{{ msg.content }}</div>
                <span class="msg-time">{{ dateTime(msg.createdAt) }}</span>
              </div>
            </div>
            <p v-if="!messages.length" class="no-message muted">和 TA 打个招呼吧，问问成色和面交时间～</p>
          </div>

          <footer class="composer">
            <el-input
              v-model="draft"
              type="textarea"
              :rows="2"
              maxlength="500"
              resize="none"
              placeholder="输入消息，Enter 发送，Shift + Enter 换行"
              @keydown.enter.exact.prevent="send"
            />
            <div class="composer-foot">
              <span class="muted small">请勿脱离平台私下转账</span>
              <el-button type="primary" round :disabled="!draft.trim()" :loading="sending" @click="send">
                发送
              </el-button>
            </div>
          </footer>
        </section>

        <section v-else class="chat-empty">
          <EmptyBox description="选择左侧会话开始聊天">
            <el-button round @click="router.push({ name: 'products' })">去看看商品</el-button>
          </EmptyBox>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listConversations, listMessages, readConversation, sendMessage as apiSendMessage } from '@/api/chat'
import { useUserStore } from '@/stores/user'
import { dateTime, fromNow, money } from '@/utils/format'
import EmptyBox from '@/components/EmptyBox.vue'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const conversations = ref([])
const messages = ref([])
const activeId = ref(String(route.params.id || ''))
const draft = ref('')
const loading = ref(true)
const sending = ref(false)
const scrollRef = ref(null)

let timer = null

const activeConversation = computed(() => conversations.value.find((c) => c.id === activeId.value) || null)

function scrollToBottom() {
  nextTick(() => {
    if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  })
}

async function loadConversations() {
  const result = await listConversations({ page: 1, pageSize: 50 })
  conversations.value = result.list
  if (!activeId.value && result.list.length) {
    activeId.value = result.list[0].id
    router.replace({ name: 'chat-detail', params: { id: activeId.value } })
  }
  loading.value = false
}

async function loadMessages(scroll = false) {
  if (!activeId.value) return
  const result = await listMessages(activeId.value, { limit: 50 })
  messages.value = result.list
  if (scroll) scrollToBottom()
}

async function markRead() {
  if (!activeId.value) return
  const last = messages.value[messages.value.length - 1]
  try {
    await readConversation(activeId.value, { lastMessageId: last?.id })
    const conv = conversations.value.find((c) => c.id === activeId.value)
    if (conv) conv.unreadCount = 0
  } catch {
    /* 忽略 */
  }
}

async function selectConversation(id) {
  if (id === activeId.value) return
  activeId.value = id
  router.replace({ name: 'chat-detail', params: { id } })
  messages.value = []
  await loadMessages(true)
  await markRead()
}

async function send() {
  const content = draft.value.trim()
  if (!content || sending.value) return
  sending.value = true
  try {
    await apiSendMessage(activeId.value, { type: 'TEXT', content })
    draft.value = ''
    await loadMessages(true)
    await markRead()
    await loadConversations()
  } catch {
    ElMessage.error('发送失败，请重试')
  } finally {
    sending.value = false
  }
}

async function poll() {
  if (!activeId.value) return
  try {
    await loadMessages()
    await markRead()
  } catch {
    /* 轮询失败忽略 */
  }
}

onMounted(async () => {
  try {
    await user.fetchProfile()
    await loadConversations()
    if (activeId.value) {
      await loadMessages(true)
      await markRead()
    }
  } catch {
    /* 未登录或加载失败时由拦截器提示 */
  }
  timer = setInterval(poll, 4000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.chat-shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  height: calc(100vh - 170px);
  min-height: 520px;
  overflow: hidden;
}

.conv-list {
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  background: #fbfdfc;
}

.conv-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 18px 18px 12px;
}

.conv-head h2 {
  font-size: 17px;
}

.conv-head .muted {
  font-size: 12px;
}

.conv-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px 10px;
}

.conv-item {
  width: 100%;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.conv-item:hover {
  background: #eef6f2;
}

.conv-item.active {
  background: #e4f4ec;
}

.conv-body {
  flex: 1;
  min-width: 0;
}

.conv-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conv-top strong {
  font-size: 14px;
}

.conv-top .time {
  font-size: 11px;
  color: var(--ink-400);
  flex-shrink: 0;
}

.conv-msg {
  font-size: 12px;
  color: var(--ink-500);
  margin-top: 3px;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}

.peer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.peer div {
  display: flex;
  flex-direction: column;
}

.peer strong {
  font-size: 15px;
}

.peer .muted {
  font-size: 11px;
}

.product-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  max-width: 320px;
  transition: border-color 0.15s ease;
}

.product-chip:hover {
  border-color: var(--brand);
}

.product-chip img {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: cover;
}

.product-chip div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-chip span {
  font-size: 12px;
  color: var(--ink-700);
}

.product-chip strong {
  font-size: 13px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f9fbfa;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  max-width: 76%;
}

.message.mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bubble {
  padding: 10px 14px;
  border-radius: 14px 14px 14px 4px;
  background: #fff;
  border: 1px solid var(--line);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.message.mine .bubble {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  border-radius: 14px 14px 4px 14px;
}

.msg-time {
  font-size: 10px;
  color: var(--ink-400);
}

.message.mine .msg-time {
  text-align: right;
}

.no-message {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
}

.composer {
  border-top: 1px solid var(--line);
  padding: 12px 16px 14px;
  background: #fff;
}

.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.small {
  font-size: 11px;
}

.chat-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 860px) {
  .chat-shell {
    grid-template-columns: 1fr;
    height: auto;
  }
  .conv-list {
    border-right: none;
    border-bottom: 1px solid var(--line);
    max-height: 220px;
  }
  .chat-panel {
    height: 70vh;
  }
}
</style>
