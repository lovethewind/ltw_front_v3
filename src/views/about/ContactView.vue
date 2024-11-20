<template>
  <div>
    <!-- banner -->
    <div class="banner" :style="cover">
      <h1 class="banner-title">联系我们</h1>
    </div>
    <!-- 关于我内容 -->
    <el-card class="blog-container">
      <!-- 介绍 -->
      <div
        ref="contact"
        v-dompurify-html="contactContent"
        class="about-content markdown-body"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import '@/assets/css/about.scss'
import { computed, onMounted, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import { markdownToHtml } from '@/utils/common'

const commonStore = useCommonStore()

const contactContent = ref('')

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['contact'].pageCover + ') center center / cover no-repeat'
})

const contactMe = computed(() => {
  return commonStore.websiteInfo.contactMe
})

onMounted(() => {
  getContactContent()
})

function getContactContent() {
  // 将markdown替换为html标签
  contactContent.value = markdownToHtml(contactMe.value)
}
</script>