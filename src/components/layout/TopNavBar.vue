<template>
  <div :class="[navClass, 'nav']">
    <!--     手机端导航栏-->
    <div class="d-md-none nav-mobile-container">
      <div class="float-left blog-title">
        <router-link to="/">
          {{ websiteInfo.home }}
        </router-link>
      </div>
      <div class="d-flex align-content-center justify-content-center">
        <div class="menus-item">
          <el-button type="primary" size="small" @click="toPostBlog">
            <Icon icon="mage:edit" />
            创作
          </el-button>
        </div>
        <a @click="openSearch">
          <Icon icon="tabler:search" />
        </a>
        <a style="margin-left:10px;" @click="openDrawer">
          <Icon icon="ep:operation" />
        </a>
      </div>
    </div>
    <!--    电脑导航栏-->
    <div class="d-md-inline-flex d-none nav-container align-content-center">
      <el-row type="flex" justify="center" align="middle" class="vw-100">
        <el-col :xs="8" :sm="7" class="ps-2">
          <div class="float-left blog-title">
            <router-link to="/">
              {{ websiteInfo.home }}
            </router-link>
          </div>
        </el-col>
        <el-col :xs="16" :sm="10" class="text-center">
          <div class="center nav-title">
            <div class="menus-item">
              <router-link class="menu-btn" to="/">
                <Icon icon="ant-design:home-outlined" class="font-18" color="#ff641e" />
                首页
              </router-link>
            </div>
            <div class="menus-item">
              <el-dropdown>
                <router-link class="menu-btn d-flex align-items-center" to="">
                  <Icon icon="carbon:book" class="font-18" color="rgb(67 198 139)" />
                  文章
                  <Icon icon="oui:arrow-down" color="rgb(67 198 139)" />
                </router-link>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="router.push('/category')">
                      <Icon icon="tabler:category" class="font-18 me-2" color="#ff831e" />
                      分类
                    </el-dropdown-item>
                    <el-dropdown-item @click="router.push('/tag')">
                      <Icon icon="fluent:tag-multiple-16-regular" class="font-18 me-2" color="#c140c3" />
                      标签
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="menus-item">
              <router-link to="/picture" class="menu-btn">
                <Icon icon="clarity:picture-line" class="font-18" color="#ff408c" />
                图库
              </router-link>
            </div>
            <div class="menus-item">
              <router-link to="/website" class="menu-btn">
                <Icon icon="solar:earth-linear" class="font-18" color="#409eff" />
                网站导航
              </router-link>
            </div>
            <div class="menus-item">
              <router-link to="/share" class="menu-btn">
                <Icon icon="tabler:apple" class="font-18" color="#68c63a" />
                分享
              </router-link>
            </div>
            <div class="menus-item">
              <router-link to="/link" class="menu-btn">
                <Icon icon="tdesign:link" class="font-18" color="#627dce" />
                友链
              </router-link>
            </div>
            <div class="menus-item">
              <router-link to="/message-board" class="menu-btn">
                <Icon icon="carbon:message-queue" class="font-18" color="#3aa3c2" />
                <span>留言板</span>
              </router-link>
            </div>
          </div>
        </el-col>
        <el-col :xs="0" :sm="7" class="pe-2">
          <div class="nav-title-right">
            <div class="menus-item">
              <Icon icon="mdi:search" @click="toSearchPage()" />
            </div>
            <div class="menus-item">
              <el-popover
                placement="top"
                title="消息"
                :width="200"
                trigger="hover"
              >
                <template #default>
                  <el-row
                    v-for="notice in NoticeTypeList"
                    :key="'notice_' + notice.value"
                    @click="toNoticePage(notice.value)"
                    class="notice-item">
                    <Icon :icon="notice.icon" />
                    <el-badge v-if="noticeUnreadCountMap[notice.value]" :value="noticeUnreadCountMap[notice.value]"
                              :offset="[12, 8]">
                      {{ notice.name }}
                    </el-badge>
                    <span v-else>{{ notice.name }}</span>
                  </el-row>
                </template>
                <template #reference>
                  <el-badge v-if="totalUnreadCount" :value="totalUnreadCount">
                    <Icon icon="mdi:bell-outline" @click="toNoticePage(NoticeTypeEnum.SYSTEM)" />
                  </el-badge>
                  <Icon v-else icon="mdi:bell-outline" @click="toNoticePage(NoticeTypeEnum.SYSTEM)" />
                </template>
              </el-popover>
            </div>
            <div class="menus-item">
              <el-button type="primary" size="small" @click="toPostBlog()">
                <Icon icon="mage:edit" class="font-18" />
                创作
              </el-button>
            </div>
            <div class="menus-item">
              <a v-if="!user" class="menu-btn" @click="openLogin">
                <Icon icon="bx:user" class="font-18" />
                登录
              </a>
              <div v-else>
                <el-dropdown>
                  <img class="user-avatar" :src="user.avatar" height="30" width="30" alt=""
                       @click="router.push('/user/' + user?.id)">
                  <template #dropdown>
                    <el-card class="user-header-profile">
                      <div class="m-2 pt-1 text-center font-14">
                        {{ user.nickname }}
                      </div>
                      <div class="m-2 pt-1 text-center font-12">
                        {{ user.summary }}
                      </div>
                      <el-divider />
                      <el-row>
                        <el-col :span="24" @click="router.push('/user/' + user?.id)">
                          <Icon icon="mingcute:user-4-line" class="font-18" color="pink" />
                          个人中心
                        </el-col>
                        <el-col :span="24" @click="logout">
                          <Icon icon="material-symbols:logout" class="font-18" color="#0d6efd" />
                          退出
                        </el-col>
                      </el-row>
                    </el-card>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

    </div>
  </div>
</template>

<style lang="scss" src="@/assets/css/header.scss" scoped />

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCommonStore } from '@/stores/common'
import { useModalStore } from '@/stores/modal'
import noticeApi from '@/api/notice'
import { needLoginUrl, NoticeTypeList } from '@/utils/constant'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import { NoticeTypeEnum } from '@/enums'
import { checkIsLogin } from '@/utils/common'
import { EventName } from '@/event-server/event-name'
import { EventServer } from '@/event-server'

const route = useRoute()
const router = useRouter()

const userStore = useUserStore()
const commonStore = useCommonStore()
const modalStore = useModalStore()

const navClass = ref('nav-fixed')
const noticeUnreadCountMap = ref({})
const totalUnreadCount = ref(0)
const eventServer = EventServer.getInstance()

const user = computed(() => {
  return userStore.user
})
const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})

onMounted(() => {
  eventServer.on(EventName.FLUSH_NOTICE_UNREAD_COUNT, getNoticeUnreadCount)
})

onUnmounted(() => {
  eventServer.off(EventName.FLUSH_NOTICE_UNREAD_COUNT, getNoticeUnreadCount)
})

function getNoticeUnreadCount() {
  if (!user.value) return
  noticeApi.getUnreadCount().then(res => {
    noticeUnreadCountMap.value = res.data
    totalUnreadCount.value = Object.values(noticeUnreadCountMap.value).reduce((a, b) => a + b)
  })
}

function toNoticePage(val: number) {
  if (!checkIsLogin()) return
  router.push('/user-notice/' + val)
}

function openSearch() {
  modalStore.setSearchFlag(true)
}

function openDrawer() {
  modalStore.setDrawer(true)
}

function openLogin() {
  modalStore.setLoginFlag(true)
}

function logout() {
  ElMessageBox.confirm('您确定要退出该账号吗?', '提示').then(() => {
    // 如果在文章发布/编辑页面则跳回主页
    if (needLoginUrl.indexOf(route.path) > -1) {
      router.push('/')
    }
    userStore.logout().then(() => {
      ElMessage({
        message: '注销成功',
        type: 'success',
        plain: true
      })
      noticeUnreadCountMap.value = {}
      totalUnreadCount.value = 0
    })
  }).catch(() => {
  })
}

function toPostBlog() {
  if (!user.value) {
    openLogin()
    return
  }
  router.push('/article/add/')
}

function toSearchPage() {
  router.push('/search')
}
</script>
