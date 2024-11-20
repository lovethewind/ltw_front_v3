<template>
  <div v-if="websiteInfo.showFooter" class="footer-wrap" :style="websiteInfo.footerStyle">
    <ul>
      <li>
        <a class="a-link" @click="router.push('/contact')">联系我们</a>
      </li>
      <li>|</li>
      <li>
        <a class="a-link" @click="router.push('/about')">关于本站</a>
      </li>
    </ul>
    <ul>
      <li>
        ©{{ 2023 }} -
        {{ new Date().getFullYear() }} By
        {{ websiteInfo.author }}
      </li>
      <li>|</li>
      <li>
        <a href="https://beian.miit.gov.cn/" target="_blank">
          {{ websiteInfo.recordNum }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'


const router = useRouter()
const commonStore = useCommonStore()

const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})
</script>

<style lang="scss" scoped>
@import "@/assets/css/variables";

.footer-wrap {
  width: 100%;
  line-height: 2;
  position: relative;
  padding: 40px 20px;
  color: #eee;
  font-size: 14px;
  text-align: center;

  ul li {
    display: inline;
    margin: 0 5px;
  }

  a {
    color: #fff;
  }
}


html.dark {
  .footer-wrap {
    background: $dark-main-color !important;
  }
}
</style>
