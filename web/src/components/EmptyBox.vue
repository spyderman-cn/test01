<template>
  <el-empty :description="description" :image-size="110">
    <slot />
  </el-empty>
</template>

<script setup>
defineProps({
  description: { type: String, default: '这里空空如也' },
})
</script>
