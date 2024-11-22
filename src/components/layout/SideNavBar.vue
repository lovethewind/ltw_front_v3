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
          <el-icon size="16" color="#ff641e">mdi-home</el-icon>
          首页
        </router-link>
      </div>
      <div class="menus-item">
        <a>
          <el-menu
            bottom
            offset-y
            :nudge-bottom="6"
          >
            <el-sub-menu>
              <template v-slot:title>
                <el-icon color="#ff641e" size="16">mdi-post</el-icon>
                文章
              </template>
            </el-sub-menu>

            <el-sub-menu dense class="cursor">
              <el-menu-item-group color="primary">
                <el-menu-item @click="router.push('/category')">
                  <el-icon color="#ff831e" size="16">mdi-view-grid</el-icon>
                  分类
                </el-menu-item>
                <el-menu-item @click="router.push('/tags')">
                  <el-icon color="#c140c3" size="16">mdi-tag-multiple</el-icon>
                  标签
                </el-menu-item>
              </el-menu-item-group>
            </el-sub-menu>
          </el-menu>
        </a>
      </div>
      <div class="menus-item">
        <router-link to="/picture" class="menu-btn">
          <el-icon color="#ff408c" size="16">mdi-image</el-icon>
          图库
        </router-link>
      </div>
      <div class="menus-item">
        <router-link to="/website" class="menu-btn">
          <el-icon color="#409eff" size="16">mdi-navigation-variant</el-icon>
          网站导航
        </router-link>
      </div>
      <div class="menus-item">
        <router-link to="/share" class="menu-btn">
          <el-icon color="#68c63a" size="16">mdi-apple</el-icon>
          分享
        </router-link>
      </div>
      <div class="menus-item">
        <router-link to="/link" class="menu-btn">
          <el-icon size="16" color="#627dce">mdi-link-variant</el-icon>
          友链
        </router-link>
      </div>
      <div class="menus-item">
        <router-link to="/message-board">
          <el-icon size="16" color="#3aa3c2">mdi-book-open-outline</el-icon>
          <span>留言板</span>
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
