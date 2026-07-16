<template>
  <div v-if="viewUser" class="user-center-page">
    <section class="profile-hero" :style="cover">
      <div class="profile-hero__shade"></div>
      <div v-if="user?.id === viewUser.id" class="profile-hero__actions">
        <el-upload
          v-if="!newBackgroundImage"
          class="profile-cover-upload"
          action=""
          :before-upload="beforeBackgroundUpload"
          accept="image/*"
          :show-file-list="false"
          placeholder="更改个人中心背景"
        >
          <button class="profile-hero__action" type="button">
            <Icon icon="tabler:photo-edit" />
            更换背景
          </button>
        </el-upload>
        <div v-if="newBackgroundImage" class="profile-hero__confirm">
          <button
            class="profile-hero__action is-primary"
            type="button"
            :disabled="changDisabled"
            @click="changBackgroundImage()"
          >
            确认修改
          </button>
          <button class="profile-hero__action" type="button" @click="cancelBackgroundEdit()">取消</button>
        </div>
      </div>
      <div class="profile-hero__content">
        <div class="profile-hero__summary">{{ viewUser.summary || '这个人很神秘，还没有写签名' }}</div>
        <div class="profile-hero__nickname">一 {{ viewUser.nickname }}</div>
      </div>
    </section>
    <div class="profile-shell">
      <aside class="profile-sidebar">
        <nav class="profile-menu-card">
          <button
            v-for="menu in menuList"
            :key="'menuItem' + menu.index"
            class="profile-menu-item"
            :class="{ 'is-active': currentActiveMenu.index === menu.index }"
            type="button"
            @click="selectMenu(menu)"
          >
            <span class="profile-menu-item__icon">
              <Icon :icon="menu.icon" />
            </span>
            <span>{{ menu.name }}</span>
          </button>
        </nav>
      </aside>
      <main class="profile-main">
        <div class="profile-content-card">
          <div class="profile-section-title">
            <span class="profile-section-title__icon">
              <Icon :icon="currentActiveMenu.icon" />
            </span>
            <div>
              <div class="profile-section-title__label">当前栏目</div>
              <h2>{{ currentActiveMenu.name }}</h2>
            </div>
          </div>
          <div class="profile-section-body">
            <user-base-info
              v-if="isSelfProfile && currentActiveMenu.index === UserSettingMenuTypeEnum.BASE_INFO"
              :view-user="viewUser"
            />
            <user-article v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.ARTICLE" :view-user="viewUser" />
            <user-follow v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.FOLLOW" :view-user="viewUser" />
            <user-collect v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.COLLECT" :view-user="viewUser" />
            <user-settings v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.SETTINGS" />
            <change-password v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.CHANGE_PASSWORD" />
          </div>
        </div>
      </main>
      <aside class="profile-aside">
        <user-detail :view-user="viewUser" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getBase64, getObjKeyCount, removeSameValues } from '@/utils/common'
import ossApi from '@/api/oss-api'
import { uploadFile } from '@/utils/oss-upload'
import userApi from '@/api/user'
import UserDetail from '@/views/user/UserDetail.vue'
import UserArticle from '@/views/user/UserArticle.vue'
import UserBaseInfo from '@/views/user/UserBaseInfo.vue'
import UserFollow from '@/views/user/UserFollow.vue'
import UserCollect from '@/views/user/UserCollect.vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { UploadFileTypeEnum, UserSettingMenuTypeEnum } from '@/enums'
import ChangePassword from '@/views/user/ChangePassword.vue'
import UserSettings from '@/views/user/UserSettings.vue'

const route = useRoute()
const userStore = useUserStore()

const menuListAll = [
  {
    index: UserSettingMenuTypeEnum.BASE_INFO,
    name: '基本信息',
    icon: 'mi:user',
    needLogin: true
  },
  {
    index: UserSettingMenuTypeEnum.ARTICLE,
    name: '文章',
    icon: 'material-symbols:article-outline',
    needLogin: false
  },
  {
    index: UserSettingMenuTypeEnum.FOLLOW,
    name: '关注/互动',
    icon: 'tabler:users',
    needLogin: false
  },
  {
    index: UserSettingMenuTypeEnum.COLLECT,
    name: '收藏',
    icon: 'ph:star',
    needLogin: false
  },
  {
    index: UserSettingMenuTypeEnum.SETTINGS,
    name: '用户设置',
    icon: 'uil:setting',
    needLogin: true
  },
  {
    index: UserSettingMenuTypeEnum.CHANGE_PASSWORD,
    name: '修改密码',
    icon: 'ph:lock',
    needLogin: true
  }
]

const viewUser = ref<any>(null)
const currentRow = ref<any>(null)
const currentActiveMenu = ref<any>({
  index: UserSettingMenuTypeEnum.BASE_INFO,
  name: '基本信息',
  icon: 'mi:user',
  needLogin: true
})
const isEdit = ref(false)
const tempCover = ref<any>(null)
const oldBackground = ref<any>(null)
const newBackgroundImage = ref<any>(null)
const changDisabled = ref(false)

const cover = computed(() => {
  return 'background: url(' + tempCover.value + ') center center / cover no-repeat'
})
const user = computed(() => {
  return userStore.user
})
const isSelfProfile = computed(() => {
  return !!user.value?.id && !!viewUser.value?.id && user.value.id === viewUser.value.id
})
const menuList = computed(() => {
  return menuListAll.filter(menu => {
    return !menu.needLogin || isSelfProfile.value
  })
})

watch([user, viewUser], () => {
  if (!menuList.value.some(menu => menu.index === currentActiveMenu.value.index)) {
    currentActiveMenu.value = menuList.value[0] || menuListAll[0]
  }
})

onMounted(() => {
  const menuIndex = String(route.query.menu || '')
  const routeMenu = menuListAll.find(menu => menu.index === menuIndex)
  if (routeMenu) {
    currentActiveMenu.value = routeMenu
  }
  const viewUserId = (route.params.userId as string | undefined) || user.value?.id || ''
  userApi.getUserById(viewUserId).then(res => {
    viewUser.value = res.data
    tempCover.value = viewUser.value.background
    currentRow.value = Object.assign({}, user.value)
    userApi.addViewCount({
      userId: viewUser.value.id
    })
  })
})


async function changBackgroundImage() {
  changDisabled.value = true
  const newData = removeSameValues(viewUser.value, currentRow.value)
  if (getObjKeyCount(newData) <= 1) {
    ElMessage({
      message: '没有更改的用户信息',
      type: 'warning',
      plain: true
    })
    changDisabled.value = false
    return
  }
  if (typeof newData.background === 'object') {
    // 上传图片
    const res = await ossApi.getUploadSignatureUrl({
      dirType: UploadFileTypeEnum.BACKGROUND,
      fileName: newData.background.name
    })
    newData.background = await uploadFile(res.data, newData.background)
  }
  userApi.update(newData).then(async () => {
    ElMessage({
      message: '修改成功',
      type: 'success',
      plain: true
    })
    isEdit.value = false
    await userStore.getInfo()
    viewUser.value = Object.assign({}, user.value)
    currentRow.value = Object.assign({}, user.value)
    tempCover.value = user.value?.background
    newBackgroundImage.value = null
  }).finally(() => {
    changDisabled.value = false
  })
}

function beforeBackgroundUpload(file: File) {
  // 验证文件类型和大小
  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    ElMessage({
      message: '上传的背景图大小不能超过20M',
      type: 'error',
      plain: true
    })
    return false
  }
  oldBackground.value = viewUser.value.background
  getBase64(file, (url: string) => {
    nextTick(() => {
      newBackgroundImage.value = url
      viewUser.value.background = file
      tempCover.value = url
    })
  })
  return false
}

function cancelBackgroundEdit() {
  viewUser.value.background = oldBackground.value
  tempCover.value = viewUser.value.background
  newBackgroundImage.value = null
}

function selectMenu(menu: any) {
  currentActiveMenu.value = menu
}

</script>

<style src="@/assets/css/user-center.scss" scoped />
