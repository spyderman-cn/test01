<template>
  <div class="page home">
    <div class="container">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-main">
          <p class="eyebrow">同校认证 · 当面验货 · 校内面交</p>
          <h1>把闲置，交给同一个校园的人</h1>
          <p class="sub">
            教材、数码、宿舍神器 —— 在东区图书馆、西区食堂门口，几分钟就能完成一次交易。
          </p>
          <div class="hero-actions">
            <el-button type="primary" size="large" round @click="router.push({ name: 'products' })">
              去逛逛
            </el-button>
            <el-button size="large" round @click="goPublish">发布闲置</el-button>
          </div>
          <div class="hero-stats">
            <div><strong>{{ total }}</strong><span>件在售</span></div>
            <div><strong>{{ todayCount }}</strong><span>今日上新</span></div>
            <div><strong>{{ categoryCount }}</strong><span>个分类</span></div>
          </div>
        </div>
        <div class="hero-visual">
          <div v-for="(item, index) in heroCards" :key="item.id" class="hero-card" :class="`c${index}`">
            <img :src="item.cover" :alt="item.title" />
          </div>
        </div>
      </section>

      <!-- 分类 -->
      <section class="block">
        <div class="section-title">
          <h2>按分类逛逛</h2>
          <span class="more" @click="router.push({ name: 'products' })">全部商品 →</span>
        </div>
        <div class="category-grid">
          <div
            v-for="cat in catalog.categories"
            :key="cat.id"
            class="category-card card"
            @click="goCategory(cat.id)"
          >
            <span class="cat-icon">{{ cat.icon }}</span>
            <div class="cat-info">
              <strong>{{ cat.name }}</strong>
              <small>{{ cat.children.map((c) => c.name).slice(0, 3).join(' / ') }}</small>
            </div>
            <el-icon class="cat-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </section>

      <!-- 最新发布 -->
      <section class="block">
        <div class="section-title">
          <h2>最新发布</h2>
          <span class="more" @click="router.push({ name: 'products', query: { sort: 'latest' } })">
            查看更多 →
          </span>
        </div>
        <el-skeleton v-if="loading" :rows="4" animated />
        <div v-else-if="latest.length" class="grid-products">
          <ProductCard v-for="item in latest" :key="item.id" :product="item" />
        </div>
        <EmptyBox v-else description="还没有商品，来发布第一件闲置吧">
          <el-button type="primary" round @click="goPublish">发布闲置</el-button>
        </EmptyBox>
      </section>

      <!-- 热门 -->
      <section class="block">
        <div class="section-title">
          <h2>校内热门</h2>
          <span class="more" @click="router.push({ name: 'products', query: { sort: 'hot' } })">
            更多热门 →
          </span>
        </div>
        <el-skeleton v-if="loading" :rows="3" animated />
        <div v-else class="grid-products">
          <ProductCard v-for="item in hot" :key="item.id" :product="item" />
        </div>
      </section>

      <!-- 保障 -->
      <section class="trust card">
        <div class="trust-item">
          <el-icon :size="24"><CircleCheckFilled /></el-icon>
          <div>
            <strong>学生身份认证</strong>
            <p>学号 + 学生证核验，只和真实的同学交易</p>
          </div>
        </div>
        <div class="trust-item">
          <el-icon :size="24"><LocationFilled /></el-icon>
          <div>
            <strong>校内当面验货</strong>
            <p>约在图书馆、食堂门口，看到实物再决定</p>
          </div>
        </div>
        <div class="trust-item">
          <el-icon :size="24"><ChatDotRound /></el-icon>
          <div>
            <strong>站内沟通</strong>
            <p>聊天记录可追溯，遇到问题可一键举报</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listProducts } from '@/api/product'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import ProductCard from '@/components/ProductCard.vue'
import EmptyBox from '@/components/EmptyBox.vue'

const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()

const latest = ref([])
const hot = ref([])
const loading = ref(true)
const total = ref(0)

const heroCards = computed(() => hot.value.slice(0, 3))
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return latest.value.filter((p) => new Date(p.createdAt).toDateString() === today).length
})
const categoryCount = computed(() =>
  catalog.categories.reduce((sum, cat) => sum + cat.children.length, 0),
)

const goCategory = (id) => router.push({ name: 'products', query: { categoryId: id } })

const goPublish = () => {
  if (!user.isLoggedIn) router.push({ name: 'login', query: { redirect: '/publish' } })
  else router.push({ name: 'publish' })
}

onMounted(async () => {
  catalog.load()
  try {
    const [latestRes, hotRes] = await Promise.all([
      listProducts({ page: 1, pageSize: 8, sort: 'latest' }),
      listProducts({ page: 1, pageSize: 4, sort: 'hot' }),
    ])
    latest.value = latestRes.list
    hot.value = hotRes.list
    total.value = latestRes.total
  } catch {
    latest.value = []
    hot.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 32px;
  align-items: center;
  padding: 44px 44px 40px;
  margin-bottom: 34px;
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(1200px 400px at 110% -20%, #cdeee1 0%, transparent 60%),
    radial-gradient(800px 300px at -10% 120%, #fff1e6 0%, transparent 55%),
    linear-gradient(135deg, #f7fdfa 0%, #eef8f2 55%, #fdf9f4 100%);
  border: 1px solid #e3efe9;
}

.eyebrow {
  display: inline-block;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--brand-dark);
  background: rgba(14, 159, 110, 0.1);
  border-radius: 999px;
  padding: 5px 12px;
  margin-bottom: 16px;
}

.hero h1 {
  font-size: 38px;
  line-height: 1.25;
  letter-spacing: -0.5px;
  margin-bottom: 14px;
}

.hero .sub {
  color: var(--ink-500);
  font-size: 15px;
  line-height: 1.7;
  max-width: 460px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin: 24px 0 26px;
}

.hero-stats {
  display: flex;
  gap: 34px;
}

.hero-stats div {
  display: flex;
  flex-direction: column;
}

.hero-stats strong {
  font-size: 22px;
  color: var(--ink-900);
}

.hero-stats span {
  font-size: 12px;
  color: var(--ink-500);
}

.hero-visual {
  position: relative;
  height: 260px;
}

.hero-card {
  position: absolute;
  width: 168px;
  height: 168px;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  border: 4px solid #fff;
  background: #fff;
}

.hero-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-card.c0 {
  right: 96px;
  top: 4px;
  transform: rotate(-6deg);
  z-index: 3;
}

.hero-card.c1 {
  right: 0;
  top: 62px;
  transform: rotate(5deg);
  z-index: 2;
}

.hero-card.c2 {
  right: 176px;
  top: 96px;
  transform: rotate(9deg);
  z-index: 1;
  width: 140px;
  height: 140px;
}

.block {
  margin-bottom: 38px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: #cdeadd;
}

.cat-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  font-size: 20px;
  border-radius: 12px;
  background: var(--brand-50);
  flex-shrink: 0;
}

.cat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cat-info strong {
  font-size: 14px;
}

.cat-info small {
  font-size: 11px;
  color: var(--ink-400);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-arrow {
  margin-left: auto;
  color: var(--ink-300);
  font-size: 13px;
}

.trust {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 22px 26px;
  margin-bottom: 10px;
  background: linear-gradient(180deg, #ffffff, #f8fbfa);
}

.trust-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: var(--brand);
}

.trust-item strong {
  display: block;
  color: var(--ink-900);
  font-size: 14px;
  margin-bottom: 4px;
}

.trust-item p {
  color: var(--ink-500);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1080px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 34px 28px;
  }
  .hero-visual {
    display: none;
  }
  .category-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .trust {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .hero h1 {
    font-size: 27px;
  }
  .hero-stats {
    gap: 22px;
  }
  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
