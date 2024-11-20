<template>
  <div>
    <!-- banner -->
    <div class="banner" :style="cover">
      <h1 class="banner-title">关于本站</h1>
    </div>
    <!-- 关于我内容 -->
    <el-card class="blog-container" shadow="always">
      <!-- 介绍 -->
      <div
        ref="aboutRef"
        v-dompurify-html="aboutContent"
        class="about-content markdown-body"
      />
    </el-card>
    <el-dialog v-model="previewImgVisible"
               @close="closePreviewImg"
               :show-close="false"
               width="70vw"
               style="margin-top: 5vh"
    >
      <el-image :src="previewImgUrl" />
    </el-dialog>
  </div>
</template>

<style src="@/assets/css/about.scss" scoped />

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import { markdownToHtml } from '@/utils/common'

const commonStore = useCommonStore()

const aboutRef = ref<HTMLElement | null>(null)
const aboutContent = ref('')
const previewImgUrl = ref('')
const previewImgVisible = ref(false)

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['about'].pageCover + ') center center / cover no-repeat'
})

const aboutMe = computed(() => {
  return commonStore.websiteInfo.aboutMe
})

onMounted(() => {
  getAboutContent()
})

function getAboutContent() {
  // 将markdown替换为html标签
  aboutContent.value = markdownToHtml(aboutMe.value)
  // 添加图片预览功能
  const images = aboutRef.value?.querySelectorAll('img')
  // 替换每个img标签为el-image组件
  images.forEach((img) => {
    img.addEventListener('click', () => {
      previewImgUrl.value = img.src
      previewImgVisible.value = true
    })
  })
}

function closePreviewImg() {
  previewImgUrl.value = ''
  previewImgVisible.value = false
}
</script>
