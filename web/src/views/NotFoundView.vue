<template>
  <div class="page not-found">
    <div class="container">
      <div class="box">
        <p class="code">404</p>
        <h1>页面走丢了</h1>
        <p class="muted">你访问的页面不存在，或者商品已经被同学买走了。</p>
        <div class="actions">
          <el-button type="primary" round @click="router.push({ name: 'home' })">回到首页</el-button>
          <el-button round @click="router.push({ name: 'products' })">逛逛商品</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  min-height: 60vh;
}

.box {
  text-align: center;
  padding: 60px 20px;
}

.code {
  font-size: 88px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #0e9f6e, #6ee7b7);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 12px;
}

.box h1 {
  font-size: 22px;
  margin-bottom: 8px;
}

.box .muted {
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 24px;
}
</style>
