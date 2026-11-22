<template>
  <div class="page products-page">
    <div class="container">
      <div class="page-head">
        <div>
          <h1>全部商品</h1>
          <p class="muted">
            共 <strong>{{ total }}</strong> 件在售闲置
            <template v-if="filters.keyword">，关键词「{{ filters.keyword }}」</template>
          </p>
        </div>
        <el-button type="primary" round @click="router.push({ name: 'publish' })">
          <el-icon><Plus /></el-icon>发布闲置
        </el-button>
      </div>

      <!-- 筛选 -->
      <section class="filter card">
        <div class="filter-row">
          <div class="field grow">
            <span class="label">分类</span>
            <el-select
              v-model="filters.categoryId"
              placeholder="全部分类"
              clearable
              style="width: 100%"
              @change="apply()"
            >
              <el-option-group v-for="cat in catalog.categories" :key="cat.id" :label="cat.name">
                <el-option :label="`全部${cat.name}`" :value="cat.id" />
                <el-option v-for="child in cat.children" :key="child.id" :label="child.name" :value="child.id" />
              </el-option-group>
            </el-select>
          </div>
          <div class="field">
            <span class="label">校区</span>
            <el-select v-model="filters.campusId" placeholder="不限校区" clearable style="width: 132px" @change="apply()">
              <el-option v-for="campus in catalog.campuses" :key="campus.id" :label="campus.name" :value="campus.id" />
            </el-select>
          </div>
          <div class="field">
            <span class="label">价格</span>
            <el-input v-model="filters.minPrice" placeholder="最低" style="width: 82px" @keyup.enter="apply()" />
            <span class="dash">—</span>
            <el-input v-model="filters.maxPrice" placeholder="最高" style="width: 82px" @keyup.enter="apply()" />
            <span class="unit">元</span>
          </div>
          <div class="field">
            <span class="label">交易方式</span>
            <el-select v-model="filters.tradeType" placeholder="不限" clearable style="width: 118px" @change="apply()">
              <el-option v-for="t in TRADE_TYPES" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </div>
          <el-button text @click="reset">重置</el-button>
        </div>

        <div class="filter-row">
          <div class="field">
            <span class="label">成色</span>
            <el-checkbox-group v-model="filters.conditions" @change="apply()">
              <el-checkbox-button v-for="c in CONDITIONS" :key="c.value" :value="c.value">
                {{ c.label }}
              </el-checkbox-button>
            </el-checkbox-group>
          </div>
        </div>
      </section>

      <!-- 排序 -->
      <div class="sort-bar">
        <el-radio-group v-model="filters.sort" size="small" @change="apply()">
          <el-radio-button v-for="s in SORT_OPTIONS" :key="s.value" :value="s.value">
            {{ s.label }}
          </el-radio-button>
        </el-radio-group>
        <span class="sort-hint">
          <el-icon><Filter /></el-icon>
          {{ activeFilterCount }} 个筛选条件
        </span>
      </div>

      <!-- 列表 -->
      <el-skeleton v-if="loading" :rows="6" animated class="skeleton" />
      <template v-else>
        <div v-if="list.length" class="grid-products">
          <ProductCard v-for="item in list" :key="item.id" :product="item" />
        </div>
        <EmptyBox v-else description="没有符合条件的商品，换个筛选试试">
          <el-button round @click="reset">清空筛选</el-button>
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
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listProducts } from '@/api/product'
import { useCatalogStore } from '@/stores/catalog'
import { CONDITIONS, SORT_OPTIONS, TRADE_TYPES } from '@/utils/constants'
import ProductCard from '@/components/ProductCard.vue'
import EmptyBox from '@/components/EmptyBox.vue'

const router = useRouter()
const route = useRoute()
const catalog = useCatalogStore()

const filters = reactive({
  keyword: '',
  categoryId: null,
  campusId: null,
  minPrice: '',
  maxPrice: '',
  conditions: [],
  tradeType: '',
  sort: 'latest',
})

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 12
const loading = ref(true)

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.categoryId) n += 1
  if (filters.campusId) n += 1
  if (filters.minPrice || filters.maxPrice) n += 1
  if (filters.tradeType) n += 1
  if (filters.conditions.length) n += 1
  if (filters.keyword) n += 1
  return n
})

function readQuery() {
  const q = route.query
  filters.keyword = String(q.keyword || '')
  filters.categoryId = q.categoryId ? Number(q.categoryId) : null
  filters.campusId = q.campusId ? Number(q.campusId) : null
  filters.minPrice = q.minPrice ? String(Number(q.minPrice) / 100) : ''
  filters.maxPrice = q.maxPrice ? String(Number(q.maxPrice) / 100) : ''
  filters.conditions = q.condition ? String(q.condition).split(',').map(Number) : []
  filters.tradeType = String(q.tradeType || '')
  filters.sort = String(q.sort || 'latest')
  page.value = Number(q.page || 1)
}

function buildQuery() {
  const q = {}
  if (filters.keyword) q.keyword = filters.keyword
  if (filters.categoryId) q.categoryId = filters.categoryId
  if (filters.campusId) q.campusId = filters.campusId
  if (filters.minPrice) q.minPrice = Math.round(Number(filters.minPrice) * 100)
  if (filters.maxPrice) q.maxPrice = Math.round(Number(filters.maxPrice) * 100)
  if (filters.conditions.length) q.condition = filters.conditions.join(',')
  if (filters.tradeType) q.tradeType = filters.tradeType
  if (filters.sort !== 'latest') q.sort = filters.sort
  if (page.value > 1) q.page = page.value
  return q
}

function apply(resetPage = true) {
  if (resetPage) page.value = 1
  router.replace({ name: 'products', query: buildQuery() })
}

function reset() {
  filters.keyword = ''
  filters.categoryId = null
  filters.campusId = null
  filters.minPrice = ''
  filters.maxPrice = ''
  filters.conditions = []
  filters.tradeType = ''
  filters.sort = 'latest'
  page.value = 1
  router.replace({ name: 'products' })
}

function onPageChange(next) {
  page.value = next
  apply(false)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function load() {
  loading.value = true
  try {
    const result = await listProducts({
      page: page.value,
      pageSize,
      keyword: filters.keyword || undefined,
      categoryId: filters.categoryId || undefined,
      campusId: filters.campusId || undefined,
      minPrice: filters.minPrice ? Math.round(Number(filters.minPrice) * 100) : undefined,
      maxPrice: filters.maxPrice ? Math.round(Number(filters.maxPrice) * 100) : undefined,
      condition: filters.conditions.length ? filters.conditions.join(',') : undefined,
      tradeType: filters.tradeType || undefined,
      sort: filters.sort,
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

watch(
  () => route.query,
  () => {
    readQuery()
    load()
  },
  { immediate: true, deep: true },
)

catalog.load()
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

.filter {
  padding: 18px 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}

.filter-row + .filter-row {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field.grow {
  flex: 1;
  min-width: 240px;
}

.label {
  font-size: 13px;
  color: var(--ink-500);
  white-space: nowrap;
}

.dash {
  color: var(--ink-400);
}

.unit {
  font-size: 12px;
  color: var(--ink-400);
}

.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.sort-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--ink-400);
}

.skeleton {
  background: #fff;
  padding: 24px;
  border-radius: var(--radius);
}

.pager {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

@media (max-width: 720px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .sort-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
