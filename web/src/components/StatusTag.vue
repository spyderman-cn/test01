<template>
  <el-tag :type="meta.type" effect="light" round size="small" class="status-tag">
    {{ meta.label }}
  </el-tag>
</template>

<script setup>
import { computed } from 'vue'
import { orderStatus, productStatus } from '@/utils/constants'

const props = defineProps({
  status: { type: String, required: true },
  scope: { type: String, default: 'product' }, // product | order
})

const meta = computed(() =>
  props.scope === 'order' ? orderStatus(props.status) : productStatus(props.status),
)
</script>

<style scoped>
.status-tag {
  font-weight: 500;
}
</style>
