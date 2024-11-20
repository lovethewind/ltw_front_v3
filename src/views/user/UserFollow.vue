<template>
  <div v-if="viewUser">
    <el-card class="user-container">
      <order-bar :bar-list="followTypeList" :use-card="false" icon="mdi:account-details" :color="'pink'" class="ms-2"
                 @item-click="orderTypeChange" />
      <div v-if="followerList.length > 0">
        <div v-for="follower in followerList" :key="follower.id" class="user-article-div">
          <el-row justify="start" align="bottom">
            <el-col :xs="4" :sm="2" class="text-center">
              <el-avatar :src="follower.avatar" />
            </el-col>
            <el-col :xs="20" :sm="18" class="ps-2">
              <el-row justify="center" align="bottom">
                <el-col>
                  <a :href="'/user/' + follower.id" target="_blank" class="font-bold font-14">
                    {{ follower.nickname }}
                  </a>
                </el-col>
              </el-row>
              <el-row justify="center" align="bottom">
                <el-col class="font-12">{{ follower.summary }}</el-col>
              </el-row>
            </el-col>
            <el-col v-if="follower.id !== user?.id" :xs="24" :sm="4" class="text-right">
              <el-button
                :type="follower.isFollowed && follower.isMyFans ? 'primary' : (follower.isFollowed ? 'danger' : 'success')"
                size="small" class="mt-2"
                @click="followUser(follower)">
                {{ follower.isFollowed && follower.isMyFans ? '互相关注' : (follower.isFollowed ? '取消关注' : '关注')
                }}
              </el-button>
            </el-col>
          </el-row>
        </div>
      </div>
      <!-- 加载更多 -->
      <load-more :loading="loading" :no-more="noMore" :total="total" @load="infiniteHandler" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRefs } from 'vue'
import { useUserStore } from '@/stores/user'
import OrderBar from '@/components/base/OrderBar.vue'
import LoadMore from '@/components/base/LoadMore.vue'
import actionApi from '@/api/action'
import { checkIsLogin } from '@/utils/common'
import { ElMessage } from 'element-plus'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { IUserDetail } from '@/interface'

const userStore = useUserStore()

const props = defineProps<{
  viewUser: IUserDetail
}>()
const { viewUser } = toRefs(props)


const followTypeList = [
  {
    type: 1,
    name: '关注'
  },
  {
    type: 2,
    name: '粉丝'
  }
]

const showType = ref(1)
const loading = ref(false)
const followerList = ref<any>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const user = computed(() => {
  return userStore.user
})
const noMore = computed(() => {
  return followerList.value.length >= total.value
})

onMounted(() => {
  infiniteHandler()
})

function infiniteHandler() {
  loading.value = true
  const func = viewUser.value.id === user.value?.id ? actionApi.getUserActionList : actionApi.getActionList
  const sendData = {
    actionType: ActionTypeEnum.FOLLOW,
    objType: ObjectTypeEnum.USER
  }
  if (showType.value === 1) { // 该用户关注的人
    sendData.userId = viewUser.value?.id
  } else { // 粉丝
    sendData.objId = viewUser.value?.id
  }
  func(currentPage.value, pageSize.value, sendData).then(res => {
    if (res.data.records.length) {
      currentPage.value++
      followerList.value.push(...res.data.records)
      total.value = res.data.total
    }
  }).finally(() => {
    loading.value = false
  })
}

function followUser(user) {
  if (!checkIsLogin()) return
  actionApi.addOrUpdate({
    objId: user.id,
    objType: ObjectTypeEnum.USER,
    actionType: ActionTypeEnum.FOLLOW
  }).then(res => {
    user.isFollowed = res.data
    if (res.data) {
      ElMessage({
        message: '关注成功',
        type: 'success',
        plain: true
      })
    } else {
      ElMessage({
        message: '取消关注成功',
        type: 'success',
        plain: true
      })
    }
  })
}

function orderTypeChange(val) {
  showType.value = val
  currentPage.value = 1
  followerList.value = []
  total.value = 0
  infiniteHandler()
}
</script>

<style src="@/assets/css/user-center.scss" scoped />
