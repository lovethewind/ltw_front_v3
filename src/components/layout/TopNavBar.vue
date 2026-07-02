<template>
  <div :class="[navClass, 'nav']">
    <!--     手机端导航栏-->
    <div class="d-md-none nav-mobile-container">
      <div class="blog-title">
        <router-link to="/">
          <span class="brand-mark">心</span>
          <span class="brand-name">{{ websiteInfo.home }}</span>
        </router-link>
      </div>
      <div class="nav-mobile-actions">
        <div class="menus-item">
          <el-button type="primary" size="small" @click="toPostBlog">
            <Icon icon="mage:edit" />
            创作
          </el-button>
        </div>
        <button class="nav-icon-button" type="button" aria-label="搜索" @click="openSearch">
          <Icon icon="tabler:search" />
        </button>
        <button
          class="nav-icon-button mobile-menu-button"
          type="button"
          aria-label="打开导航菜单"
          @click="mobileMenuVisible = true"
        >
          <Icon icon="tabler:menu-2" />
        </button>
      </div>
      <el-drawer
        v-model="mobileMenuVisible"
        append-to-body
        class="mobile-menu-drawer"
        direction="rtl"
        size="76%"
        title="导航"
      >
        <div class="mobile-menu-list">
          <router-link
            v-for="menu in navMenus"
            :key="'mobile_nav_' + menu.path"
            :to="menu.path"
            class="mobile-menu-item"
            @click="handleMobileMenuSelect(menu.path)"
          >
            <Icon :icon="menu.icon" />
            <span>{{ menu.name }}</span>
          </router-link>
        </div>
      </el-drawer>
    </div>
    <!--    电脑导航栏-->
    <div class="d-md-inline-flex d-none nav-container align-content-center">
      <el-row type="flex" justify="center" align="middle" class="nav-inner">
        <el-col :xs="8" :sm="7" class="ps-2">
          <div class="float-left blog-title">
            <router-link to="/">
              <span class="brand-mark">心</span>
              <span class="brand-name">{{ websiteInfo.home }}</span>
            </router-link>
          </div>
        </el-col>
        <el-col :xs="16" :sm="10" class="text-center">
          <div class="center nav-title">
            <div
              v-for="menu in navMenus"
              :key="'desktop_nav_' + menu.path"
              class="menus-item"
            >
              <router-link :to="menu.path" class="menu-btn">
                {{ menu.name }}
              </router-link>
            </div>
          </div>
        </el-col>
        <el-col :xs="0" :sm="7" class="pe-2">
          <div class="nav-title-right">
            <div class="nav-actions">
              <button class="nav-action-button" type="button" aria-label="打开搜索页" @click="toSearchPage">
                <Icon icon="tabler:search" />
              </button>
              <el-popover
                v-if="user"
                placement="bottom-end"
                popper-class="notice-popover"
                :width="280"
                trigger="hover"
              >
                <template #default>
                  <div class="notice-panel">
                    <div class="notice-panel-header">
                      <div>
                        <div class="notice-panel-title">消息通知</div>
                        <div class="notice-panel-summary">
                          {{ totalUnreadCount ? '共 ' + totalUnreadCount + ' 条未读' : '暂无未读消息' }}
                        </div>
                      </div>
                      <span class="notice-panel-dot" :class="{ 'is-empty': !totalUnreadCount }" />
                    </div>
                    <div v-if="unreadNoticeList.length" class="notice-panel-list">
                      <button
                        v-for="notice in unreadNoticeList"
                        :key="'notice_' + notice.value"
                        type="button"
                        class="notice-item"
                        @click="toNoticePage(notice.value)"
                      >
                        <span class="notice-item-icon">
                          <Icon :icon="notice.icon" />
                        </span>
                        <span class="notice-item-content">
                          <span class="notice-item-name">{{ notice.name }}</span>
                          <span class="notice-item-desc">
                            有新的消息
                          </span>
                        </span>
                        <span class="notice-item-count">
                          {{ getNoticeUnreadCountByType(notice.value) }}
                        </span>
                      </button>
                    </div>
                    <div v-else class="notice-panel-empty">
                      <Icon icon="tabler:bell-check" />
                      <span>暂无未读消息</span>
                    </div>
                  </div>
                </template>
                <template #reference>
                  <el-badge v-if="totalUnreadCount" :value="totalUnreadCount" class="nav-action-badge">
                    <button class="nav-action-button" type="button" aria-label="查看消息"
                            @click="toNoticePage(NoticeTypeEnum.SYSTEM)">
                      <Icon icon="mdi:bell-outline" />
                    </button>
                  </el-badge>
                  <button v-else class="nav-action-button" type="button" aria-label="查看消息"
                          @click="toNoticePage(NoticeTypeEnum.SYSTEM)">
                    <Icon icon="mdi:bell-outline" />
                  </button>
                </template>
              </el-popover>
              <button class="nav-write-button" type="button" aria-label="创作文章" @click="toPostBlog()">
                <Icon icon="mage:edit" />
                <span>创作</span>
              </button>
              <button v-if="!user" class="nav-action-button nav-login-button" type="button" aria-label="登录"
                      @click="openLogin">
                <Icon icon="bx:user" />
              </button>
              <div v-else>
                <el-dropdown popper-class="user-profile-popper" trigger="hover">
                  <button class="user-avatar-button" type="button" aria-label="打开用户菜单">
                    <img class="user-avatar" :src="user.avatar" height="30" width="30" alt="">
                  </button>
                  <template #dropdown>
                    <div class="user-profile-card">
                      <div class="user-profile-header">
                        <img class="user-profile-avatar" :src="user.avatar" alt="">
                        <div class="user-profile-meta">
                          <div class="user-profile-name">{{ user.nickname }}</div>
                          <div class="user-profile-summary">
                            {{ user.summary || '这个人很神秘，还没有简介' }}
                          </div>
                        </div>
                      </div>
                      <div class="user-profile-actions">
                        <button class="user-profile-action" type="button" @click="router.push('/user/' + user?.id)">
                          <span class="user-profile-action-icon">
                            <Icon icon="mingcute:user-4-line" />
                          </span>
                          <span>个人中心</span>
                          <Icon class="user-profile-action-arrow" icon="tabler:chevron-right" />
                        </button>
                        <button class="user-profile-action is-danger" type="button" @click="logout">
                          <span class="user-profile-action-icon">
                            <Icon icon="material-symbols:logout" />
                          </span>
                          <span>退出登录</span>
                          <Icon class="user-profile-action-arrow" icon="tabler:chevron-right" />
                        </button>
                      </div>
                    </div>
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

interface NavMenu {
  name: string
  path: string
  icon: string
}

const route = useRoute()
const router = useRouter()

const userStore = useUserStore()
const commonStore = useCommonStore()
const modalStore = useModalStore()

const navClass = ref('nav-fixed')
const mobileMenuVisible = ref(false)
const noticeUnreadCountMap = ref<any>({})
const totalUnreadCount = ref(0)
const eventServer = EventServer.getInstance()
const navMenus: NavMenu[] = [
  { name: '首页', path: '/', icon: 'tabler:home' },
  { name: '图库', path: '/picture', icon: 'tabler:photo' },
  { name: '网站导航', path: '/website', icon: 'tabler:compass' },
  { name: '友链', path: '/link', icon: 'tabler:link' },
  { name: '留言板', path: '/message-board', icon: 'tabler:message-circle' }
]

const user = computed(() => {
  return userStore.user
})
const websiteInfo = computed(() => {
  return commonStore.websiteInfo
})
const unreadNoticeList = computed(() => {
  return NoticeTypeList.filter(notice => getNoticeUnreadCountByType(notice.value) > 0)
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
    totalUnreadCount.value = (Object.values(noticeUnreadCountMap.value) as any[]).reduce((a, b) => Number(a) + Number(b), 0)
  })
}

function toNoticePage(val: number) {
  if (!checkIsLogin()) return
  router.push('/user-notice/' + val)
}

/**
 * 获取指定通知类型的未读数量。
 *
 * :param noticeValue: 通知类型值。
 * :return: 当前通知类型的未读数量。
 */
function getNoticeUnreadCountByType(noticeValue: number): number {
  return Number(noticeUnreadCountMap.value[noticeValue] || 0)
}

function openSearch() {
  modalStore.setSearchFlag(true)
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

/**
 * 处理移动端菜单项点击，关闭抽屉并交给路由链接完成跳转。
 *
 * :param path: 当前点击的菜单路径。
 * :return: 无返回值。
 */
function handleMobileMenuSelect(path: string): void {
  void path
  mobileMenuVisible.value = false
}
</script>
