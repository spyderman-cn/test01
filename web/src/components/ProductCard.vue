<template>
  <article class="product-card card" @click="goDetail">
    <div class="cover">
      <img :src="product.cover" :alt="product.title" loading="lazy" />
      <span class="condition">{{ conditionLabel(product.condition) }}</span>
      <span v-if="product.status !== 'ON_SALE'" class="sold-mask">
        {{ productStatus(product.status).label }}
      </span>
    </div>
    <div class="body">
      <h3 class="title ellipsis-2">{{ product.title }}</h3>
      <div class="price-row">
        <span class="price">{{ money(product.price) }}</span>
        <span v-if="product.originalPrice" class="price-old">¥{{ money(product.originalPrice) }}</span>
      </div>
      <div class="meta">
        <span class="campus">
          <el-icon><Location /></el-icon>
          {{ product.campus?.name || '校区未填' }}
        </span>
        <span class="stats">{{ product.stats?.views || 0 }} 浏览</span>
      </div>
      <div class="seller">
        <el-avatar :size="20" :src="product.seller?.avatar">{{ product.seller?.nickname?.[0] }}</el-avatar>
        <span class="ellipsis">{{ product.seller?.nickname || '匿名' }}</span>
        <el-icon v-if="product.seller?.verified" class="verified" title="已认证"><CircleCheckFilled /></el-icon>
      </div>
    </div>
  </article>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { conditionLabel, productStatus } from '@/utils/constants'
import { money } from '@/utils/format'

const props = defineProps({
  product: { type: Object, required: true },
})

const router = useRouter()
const goDetail = () => router.push({ name: 'product-detail', params: { id: props.product.id } })
</script>

<style scoped>
.product-card {
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.product-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.cover {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #eef2f1;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .cover img {
  transform: scale(1.04);
}

.condition {
  position: absolute;
  left: 10px;
  top: 10px;
  padding: 2px 8px;
  font-size: 12px;
  color: #0b3b2c;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.sold-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(17, 24, 39, 0.45);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
}

.body {
  padding: 12px 14px 14px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  min-height: 42px;
  color: var(--ink-900);
}

.price-row {
  display: flex;
  align-items: baseline;
  margin: 6px 0 8px;
}

.price {
  font-size: 19px;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink-500);
  margin-bottom: 10px;
}

.campus {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.seller {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-500);
  padding-top: 10px;
  border-top: 1px dashed var(--line);
}

.verified {
  color: var(--brand);
  font-size: 13px;
}
</style>
