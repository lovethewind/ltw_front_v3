<template>
  <div class="build-div">
    <!-- banner -->
    <div class="banner" :style="cover">
      <h1 class="banner-title">开发中</h1>
    </div>
    <el-card class="blog-container">
      <div class="build-text">
        该板块正在开发中，敬请期待~
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import '@/assets/css/about.scss'
import { computed } from 'vue'
import { useCommonStore } from '@/stores/common'

const store = useCommonStore()

const cover = computed(() => {
  const cover = store.pageCoverMap['onBuild'].pageCover
  return `background: url(${cover}) center center / cover no-repeat`
})
</script>