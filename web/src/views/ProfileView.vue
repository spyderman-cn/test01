<template>
  <div class="page profile-page">
    <div class="container">
      <div v-if="!user.profile" class="profile-loading">
        <el-skeleton :rows="6" animated />
      </div>

      <template v-else>
        <!-- 资料卡 -->
        <section class="profile-head card">
          <div class="avatar-box" @click="pickAvatar">
            <el-avatar :size="76" :src="user.profile.avatar">{{ user.profile.nickname[0] }}</el-avatar>
            <span class="avatar-mask">更换</span>
            <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatar" />
          </div>

          <div class="profile-main">
            <div class="name-row">
              <h1>{{ user.profile.nickname }}</h1>
              <el-tag v-if="user.profile.verified" type="success" effect="light" round>
                <el-icon><CircleCheckFilled /></el-icon> 已认证
              </el-tag>
              <el-tag v-else type="warning" effect="light" round>未认证</el-tag>
            </div>
            <p class="bio">{{ user.profile.bio || '还没有填写简介' }}</p>
            <div class="meta-row">
              <span><el-icon><Location /></el-icon>{{ user.profile.campus?.name || '未设置校区' }}</span>
              <span><el-icon><StarFilled /></el-icon>信用分 {{ user.profile.creditScore }}</span>
              <span><el-icon><Calendar /></el-icon>{{ dateOnly(user.profile.createdAt) }} 加入</span>
            </div>
          </div>

          <div class="profile-actions">
            <el-button round @click="openEdit">编辑资料</el-button>
            <el-button round @click="logout">退出登录</el-button>
          </div>

          <div class="stats-row">
            <div class="stat"><strong>{{ user.profile.stats?.onSale ?? 0 }}</strong><span>在售</span></div>
            <div class="stat"><strong>{{ user.profile.stats?.sold ?? 0 }}</strong><span>卖出</span></div>
            <div class="stat"><strong>{{ user.profile.stats?.bought ?? 0 }}</strong><span>买到</span></div>
            <div class="stat"><strong>{{ user.profile.stats?.favorites ?? 0 }}</strong><span>收藏</span></div>
          </div>
        </section>

        <!-- 学生认证 -->
        <section class="verify-card card">
          <div class="verify-info">
            <h3>学生认证</h3>
            <p v-if="verify.status === 'APPROVED'" class="muted">
              已于 {{ dateOnly(verify.reviewedAt) }} 通过认证，可以自由发布与下单。
            </p>
            <p v-else-if="verify.status === 'PENDING'" class="muted">
              材料已提交，一般 24 小时内完成审核（演示环境 3 秒后自动通过）。
            </p>
            <p v-else class="muted">
              完成认证后才可以发布商品和下单，认证信息仅用于校内身份核验。
            </p>
          </div>
          <el-tag v-if="verify.status === 'APPROVED'" type="success" effect="light" round>已认证</el-tag>
          <el-tag v-else-if="verify.status === 'PENDING'" type="warning" effect="light" round>审核中</el-tag>
          <el-button v-else type="primary" round @click="verifyVisible = true">立即认证</el-button>
        </section>

        <!-- Tabs -->
        <section class="tabs-card card">
          <el-tabs v-model="activeTab" @tab-change="onTabChange">
            <el-tab-pane label="我的商品" name="products">
              <div v-if="myProducts.length" class="mini-list">
                <article v-for="item in myProducts" :key="item.id" class="mini-item">
                  <img :src="item.cover" :alt="item.title" @click="goProduct(item.id)" />
                  <div class="mini-info">
                    <strong class="ellipsis-2" @click="goProduct(item.id)">{{ item.title }}</strong>
                    <div class="mini-meta">
                      <span class="price">{{ money(item.price) }}</span>
                      <StatusTag :status="item.status" />
                    </div>
                  </div>
                  <div class="mini-actions">
                    <el-button
                      v-if="item.status === 'ON_SALE'"
                      text
                      size="small"
                      @click="changeStatus(item, 'OFF_SHELF')"
                    >
                      下架
                    </el-button>
                    <el-button
                      v-if="item.status === 'OFF_SHELF'"
                      text
                      size="small"
                      type="primary"
                      @click="changeStatus(item, 'ON_SALE')"
                    >
                      重新上架
                    </el-button>
                    <el-button text size="small" type="danger" @click="remove(item)">删除</el-button>
                  </div>
                </article>
              </div>
              <EmptyBox v-else description="还没有发布过商品">
                <el-button type="primary" round @click="router.push({ name: 'publish' })">发布闲置</el-button>
              </EmptyBox>
            </el-tab-pane>

            <el-tab-pane label="我的收藏" name="favorites">
              <div v-if="favorites.length" class="grid-products">
                <ProductCard v-for="item in favorites" :key="item.id" :product="item" />
              </div>
              <EmptyBox v-else description="还没有收藏的商品">
                <el-button round @click="router.push({ name: 'products' })">去逛逛</el-button>
              </EmptyBox>
            </el-tab-pane>

            <el-tab-pane label="浏览历史" name="history">
              <div class="tab-toolbar">
                <span class="muted">最近看过的商品</span>
                <el-button v-if="history.length" text size="small" @click="clearHistoryList">清空历史</el-button>
              </div>
              <div v-if="history.length" class="grid-products">
                <ProductCard v-for="item in history" :key="item.id" :product="item" />
              </div>
              <EmptyBox v-else description="还没有浏览记录" />
            </el-tab-pane>

            <el-tab-pane label="账号设置" name="settings">
              <div class="settings">
                <div class="setting-row">
                  <div>
                    <strong>账号信息</strong>
                    <p class="muted">手机号 {{ user.profile.phone }}</p>
                  </div>
                  <el-button text @click="openEdit">修改资料</el-button>
                </div>
                <div class="setting-row" v-if="isMockEnabled">
                  <div>
                    <strong>演示数据</strong>
                    <p class="muted">所有数据保存在本机浏览器，重置后会恢复为初始演示内容</p>
                  </div>
                  <el-button text type="danger" @click="resetData">重置演示数据</el-button>
                </div>
                <div class="setting-row">
                  <div>
                    <strong>退出登录</strong>
                    <p class="muted">退出后需要重新登录才能发布、下单和聊天</p>
                  </div>
                  <el-button text @click="logout">退出登录</el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </section>
      </template>
    </div>

    <!-- 编辑资料 -->
    <el-dialog v-model="editVisible" title="编辑资料" width="440px">
      <el-form label-position="top">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="3" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="常驻校区">
          <el-select v-model="editForm.campusId" style="width: 100%">
            <el-option v-for="c in catalog.campuses" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 学生认证 -->
    <el-dialog v-model="verifyVisible" title="学生认证" width="480px">
      <el-alert type="info" :closable="false" show-icon class="verify-tip">
        提交学号与学生证照片，仅用于校内身份核验，审核人员之外不可见。
      </el-alert>
      <el-form label-position="top" class="verify-form">
        <el-form-item label="真实姓名" required>
          <el-input v-model="verifyForm.realName" placeholder="与学籍一致" />
        </el-form-item>
        <el-form-item label="学号" required>
          <el-input v-model="verifyForm.studentNo" placeholder="例如 2023010101" />
        </el-form-item>
        <el-form-item label="学生证照片" required>
          <div class="uploader">
            <div v-for="(image, index) in verifyForm.images" :key="index" class="tile">
              <img :src="image" alt="学生证" />
              <button type="button" class="del" @click="verifyForm.images.splice(index, 1)">×</button>
            </div>
            <button v-if="verifyForm.images.length < 3" type="button" class="tile add" @click="pickVerify">
              <el-icon :size="20"><Plus /></el-icon>
              <span>上传</span>
            </button>
            <input ref="verifyInput" type="file" accept="image/*" hidden @change="onVerifyImage" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyVisible = false">取消</el-button>
        <el-button type="primary" :loading="verifying" @click="submitVerify">提交认证</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { changeProductStatus, deleteProduct, listFavorites, listHistory, clearHistory } from '@/api/product'
import { listMyProducts } from '@/api/product'
import { submitVerification, updateAvatar } from '@/api/user'
import { uploadImage } from '@/api/upload'
import { isMockEnabled, resetMockDb } from '@/mock'
import { dateOnly, money } from '@/utils/format'
import { clearToken } from '@/api/http'
import ProductCard from '@/components/ProductCard.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyBox from '@/components/EmptyBox.vue'

const router = useRouter()
const user = useUserStore()
const catalog = useCatalogStore()

const activeTab = ref('products')
const myProducts = ref([])
const favorites = ref([])
const history = ref([])
const editVisible = ref(false)
const verifyVisible = ref(false)
const saving = ref(false)
const verifying = ref(false)
const avatarInput = ref(null)
const verifyInput = ref(null)

const editForm = reactive({ nickname: '', bio: '', campusId: 1 })
const verifyForm = reactive({ realName: '', studentNo: '', images: [] })

const verify = computed(() => user.profile?.verification || { status: 'NONE' })

async function loadProducts() {
  const result = await listMyProducts({ page: 1, pageSize: 50 })
  myProducts.value = result.list
}

async function loadFavorites() {
  const result = await listFavorites({ page: 1, pageSize: 50 })
  favorites.value = result.list
}

async function loadHistory() {
  const result = await listHistory({ page: 1, pageSize: 50 })
  history.value = result.list
}

async function onTabChange(name) {
  if (name === 'products') await loadProducts()
  if (name === 'favorites') await loadFavorites()
  if (name === 'history') await loadHistory()
}

const openEdit = () => {
  editForm.nickname = user.profile.nickname
  editForm.bio = user.profile.bio || ''
  editForm.campusId = user.profile.campus?.id || 1
  editVisible.value = true
}

async function saveProfile() {
  saving.value = true
  try {
    await user.updateProfile({
      nickname: editForm.nickname,
      bio: editForm.bio,
      campusId: editForm.campusId,
    })
    editVisible.value = false
  } finally {
    saving.value = false
  }
}

const pickAvatar = () => avatarInput.value?.click()

async function onAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 5MB')
    return
  }
  const result = await uploadImage(file, 'AVATAR')
  await updateAvatar({ url: result.url })
  await user.fetchProfile(true)
  ElMessage.success('头像已更新')
}

const pickVerify = () => verifyInput.value?.click()

async function onVerifyImage(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const result = await uploadImage(file, 'VERIFICATION')
  verifyForm.images.push(result.url)
}

async function submitVerify() {
  if (!verifyForm.realName || !verifyForm.studentNo) {
    ElMessage.warning('请填写姓名和学号')
    return
  }
  if (!verifyForm.images.length) {
    ElMessage.warning('请上传学生证照片')
    return
  }
  verifying.value = true
  try {
    await submitVerification({
      realName: verifyForm.realName,
      studentNo: verifyForm.studentNo,
      schoolId: 1,
      studentCardImages: verifyForm.images,
    })
    verifyVisible.value = false
    ElMessage.success('已提交，演示环境 3 秒后自动通过')
    setTimeout(() => user.fetchProfile(true), 3200)
  } finally {
    verifying.value = false
  }
}

async function changeStatus(item, action) {
  await changeProductStatus(item.id, { action })
  ElMessage.success('操作成功')
  await loadProducts()
}

async function remove(item) {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定删除吗？', '删除商品', { type: 'warning' })
    await deleteProduct(item.id)
    ElMessage.success('已删除')
    await loadProducts()
  } catch {
    /* 取消 */
  }
}

async function clearHistoryList() {
  await clearHistory()
  history.value = []
  ElMessage.success('已清空')
}

async function resetData() {
  try {
    await ElMessageBox.confirm('将恢复到初始演示数据，当前的操作记录会丢失。', '重置演示数据', {
      type: 'warning',
      confirmButtonText: '重置',
    })
    resetMockDb()
    user.reset()
    clearToken()
    ElMessage.success('已重置')
    setTimeout(() => window.location.reload(), 600)
  } catch {
    /* 取消 */
  }
}

async function logout() {
  await user.logout()
  router.push({ name: 'home' })
}

const goProduct = (id) => router.push({ name: 'product-detail', params: { id } })

onMounted(async () => {
  catalog.load()
  try {
    await user.fetchProfile(true)
    await loadProducts()
  } catch {
    /* 未登录或加载失败时由路由守卫与拦截器处理 */
  }
})
</script>

<style scoped>
.profile-loading {
  background: #fff;
  padding: 24px;
  border-radius: var(--radius);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.avatar-box {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.5);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.avatar-box:hover .avatar-mask {
  opacity: 1;
}

.profile-main {
  flex: 1;
  min-width: 220px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.name-row h1 {
  font-size: 22px;
}

.bio {
  color: var(--ink-500);
  font-size: 13px;
  margin-bottom: 8px;
}

.meta-row {
  display: flex;
  gap: 18px;
  font-size: 12px;
  color: var(--ink-500);
  flex-wrap: wrap;
}

.meta-row span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.stats-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding-top: 18px;
  margin-top: 4px;
  border-top: 1px dashed var(--line);
}

.stat {
  text-align: center;
}

.stat strong {
  display: block;
  font-size: 20px;
}

.stat span {
  font-size: 12px;
  color: var(--ink-500);
}

.verify-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  margin-bottom: 14px;
}

.verify-info h3 {
  font-size: 15px;
  margin-bottom: 6px;
}

.verify-info p {
  font-size: 13px;
}

.tabs-card {
  padding: 8px 22px 22px;
}

.mini-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mini-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.mini-item img {
  width: 68px;
  height: 68px;
  border-radius: 10px;
  object-fit: cover;
  cursor: pointer;
}

.mini-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
}

.mini-info strong {
  font-size: 14px;
  line-height: 1.5;
}

.mini-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mini-meta .price {
  font-size: 16px;
}

.mini-actions {
  display: flex;
  gap: 4px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 13px;
}

.settings {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px dashed var(--line);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row strong {
  font-size: 14px;
}

.setting-row p {
  font-size: 12px;
  margin-top: 3px;
}

.verify-tip {
  margin-bottom: 14px;
  border-radius: 10px;
}

.verify-form {
  margin-top: 4px;
}

.uploader {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tile {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #f7faf9;
}

.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tile .del {
  position: absolute;
  right: 3px;
  top: 3px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(17, 24, 39, 0.6);
  color: #fff;
  cursor: pointer;
  line-height: 1;
}

.tile.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: var(--ink-400);
  cursor: pointer;
  border-style: dashed;
}

@media (max-width: 720px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .profile-actions {
    width: 100%;
  }
}
</style>
