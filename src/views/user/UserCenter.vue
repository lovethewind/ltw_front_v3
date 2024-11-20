<template>
  <div v-if="viewUser">
    <div class="banner" :style="cover">
      <div class="user-summary">{{ viewUser.summary }}</div>
      <div class="user-nickname">一 {{ viewUser.nickname }}</div>
      <div v-if="user?.id === viewUser.id" class="read-info">
        <el-upload
          v-if="!newBackgroundImage"
          class="avatar-upload"
          action=""
          :before-upload="beforeBackgroundUpload"
          accept="image/*"
          :show-file-list="false"
          placeholder="更改个人中心背景"
        >
          <el-button type="success" size="small">更改背景</el-button>
        </el-upload>
        <span v-if="newBackgroundImage">
          <el-button type="success" size="small" :disabled="changDisabled"
                     @click="changBackgroundImage()">确认修改</el-button>
          <el-button type="info" size="small" @click="cancelBackgroundEdit()">取消</el-button>
        </span>
      </div>
    </div>
    <div class="tabs-container">
      <el-row>
        <el-col :md="4" class="user-menu pe-2">
          <el-card>
            <el-menu :default-active="currentActiveMenu.index">
              <el-menu-item v-for="menu in menuList" :key="'menuItem' + menu.index" :index="menu.index"
                            @click="selectMenu(menu)">
                <template #title>
                  <Icon :icon="menu.icon" class="me-1" />
                  {{ menu.name }}
                </template>
              </el-menu-item>
            </el-menu>
          </el-card>
        </el-col>
        <el-col :md="15">
          <el-card class="mb-1">
            <div class="font-18 font-500 p-2 d-flex align-items-center">
              <Icon :icon="currentActiveMenu.icon" class="me-1" />
              {{ currentActiveMenu.name }}
            </div>
          </el-card>
          <user-base-info v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.BASE_INFO" :view-user="viewUser" />
          <user-article v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.ARTICLE" :view-user="viewUser" />
          <user-follow v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.FOLLOW" :view-user="viewUser" />
          <user-collect v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.COLLECT" :view-user="viewUser" />
          <user-settings v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.SETTINGS" />
          <change-password v-if="currentActiveMenu.index === UserSettingMenuTypeEnum.CHANGE_PASSWORD" />
        </el-col>
        <el-col :md="5" class="ps-2">
          <user-detail :view-user="viewUser" />
        </el-col>
      </el-row>
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
    needLogin: false
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
const currentActiveMenu = ref({
  index: UserSettingMenuTypeEnum.BASE_INFO,
  name: '基本信息',
  icon: 'mi:user',
  needLogin: false
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
const menuList = computed(() => {
  return menuListAll.filter(menu => {
    return !menu.needLogin || user.value?.id === viewUser.value.id
  })
})

watch(user, (val) => {
  if (!val && currentActiveMenu.value.needLogin) {
    currentActiveMenu.value = menuListAll.find(menu => menu.index === UserSettingMenuTypeEnum.BASE_INFO)
  }
})

onMounted(() => {
  const viewUserId = route.params.userId || user.value?.id
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
    tempCover.value = user.value.background
    newBackgroundImage.value = null
  }).finally(() => {
    changDisabled.value = false
  })
}

function beforeBackgroundUpload(file) {
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
  getBase64(file, url => {
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
