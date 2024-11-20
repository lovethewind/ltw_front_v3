<template>
  <el-container>
    <el-header>
      <!-- 导航栏 -->
      <TopNavBar />
      <!-- 侧边导航栏 -->
      <SideNavBar />
    </el-header>
    <el-main ref="mainRef">
      <!-- 内容 -->
      <router-view v-if="isReady" :key="$route.fullPath" />
    </el-main>
    <el-footer>
      <!-- 页脚 -->
      <FooterView />
    </el-footer>
    <!--以下为悬浮弹出框-->
    <!-- 返回顶部 -->
    <BackTop />
    <!-- 登录模态框 -->
    <LoginModel />
    <!-- 注册模态框 -->
    <RegisterModel />
    <!-- 忘记密码模态框 -->
    <ForgetModel />
    <FeedBack />
    <ChatView />
    <WsModel />
  </el-container>
</template>

<script setup lang="ts">
import '@/assets/css/bootstrap/bootstrap.scss'
import '@/assets/css/element/index.scss'
import '@/assets/css/main.scss'

import { onBeforeMount, ref } from 'vue'
import { RouterView } from 'vue-router'
import TopNavBar from '@/components/layout/TopNavBar.vue'
import SideNavBar from '@/components/layout/SideNavBar.vue'
import BackTop from '@/components/base/BackTop.vue'
import LoginModel from '@/components/model/LoginModel.vue'
import RegisterModel from '@/components/model/RegisterModel.vue'
import ForgetModel from '@/components/model/ForgetModel.vue'
import FeedBack from '@/components/base/FeedBack.vue'
import FooterView from '@/components/layout/FooterView.vue'
import WsModel from '@/components/ws/WSIndex.vue'
import ChatView from '@/components/chat/IndexView.vue'

import { useCommonStore } from '@/stores/common'

const commonStore = useCommonStore()

const isReady = ref(false)
const mainRef = ref<HTMLElement>(null)


onBeforeMount(async () => {
  await commonStore.setCommonInfoCache()
  isReady.value = true
})

</script>