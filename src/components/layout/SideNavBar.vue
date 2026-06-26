<template>
  <div v-if="drawer">
    <!-- 网站介绍 -->
    <div class="blogger-info">
      {{ websiteInfo.bulletin }}
    </div>
    <!-- 博客信息 -->
    <hr>
    <!-- 页面导航 -->
    <div class="menu-container">
      <div class="menus-item">
        <router-link to="/">
          首页
        </router-link>
      </div>
      <div class="menus-item">
        <router-link to="/picture" class="menu-btn">图库</router-link>
      </div>
      <div class="menus-item">
        <router-link to="/website" class="menu-btn">网站导航</router-link>
      </div>
      <div class="menus-item">
        <router-link to="/link" class="menu-btn">友链</router-link>
      </div>
      <div class="menus-item">
        <router-link to="/message-board">
          留言板
        </router-link>
      </div>
      <div v-if="!user" class="menus-item">
        <a @click="openLogin"><i class="el-icon-user-solid" /> 登录 </a>
      </div>
      <div v-else>
        <div class="menus-item">
          <router-link to="/user">
            <i class="el-icon-s-custom" style="color: pink" /> 个人中心
          </router-link>
        </div>
        <div class="menus-item">
          <a @click="logout">
            <el-icon size="14" color="#0d6efd">mdi-logout-variant</el-icon>
            退出</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCommonStore } from '@/stores/common'
import { useModalStore } from '@/stores/modal'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { needLoginUrl } from '@/utils/constant'


const router = useRouter()
const route = useRoute()
const commonStore = useCommonStore()
const modalStore = useModalStore()
const userStore = useUserStore()

const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})
const user = computed(() => {
  return userStore.user
})

const drawer = computed(() => {
  return modalStore.drawer
})

function openLogin() {
  modalStore.setLoginFlag(true)
}

function logout() {
  if (needLoginUrl.indexOf(route.path) > -1) {
    router.push('/')
  }
  userStore.logout().then(() => {
    ElMessage({
      message: '注销成功',
      type: 'success',
      plain: true
    })
  })
}

</script>

<style scoped>
.blogger-info {
  padding: 26px 30px 0;
  text-align: center;
}

.blog-info-wrapper {
  display: flex;
  align-items: center;
  padding: 12px 10px 0;
}

.blog-info-data {
  flex: 1;
  line-height: 2;
  text-align: center;
}

hr {
  border: 2px dashed #d2ebfd;
  margin: 20px 0;
}

.menu-container {
  padding: 0 10px 40px;
  animation: 0.8s ease 0s 1 normal none running sidebarItem;
}

.menus-item a {
  padding: 6px 30px;
  display: block;
  line-height: 2;
}

.menus-item i {
  margin-right: 2rem;
}

.v-list-item__icon {
  margin-right: 0 !important;
}

@keyframes sidebarItem {
  0% {
    transform: translateX(200px);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
