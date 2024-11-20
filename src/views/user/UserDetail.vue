<template>
  <div v-if="viewUser" class="sticky-top-70">
    <el-card class="user-detail-div">
      <div class="container-wrapper">
        <el-row align="middle" justify="start">
          <el-col :span="8">
            <el-avatar :size="80" :src="viewUser.avatar" />
          </el-col>
          <el-col :span="16" class="username-info">
            <el-row align="middle" justify="start">
              <el-col :span="24">
                {{ viewUser.nickname }}
                <Icon :icon="genderMap[viewUser.gender].icon" :color="genderMap[viewUser.gender].color" />
              </el-col>
              <el-col :span="24" class="font-12">
                {{ viewUser.summary }}
              </el-col>
            </el-row>
          </el-col>
        </el-row>
        <el-row align="middle" justify="start">
          <el-col :span="24">
            <Icon icon="mdi:id-card" color="skyblue" />
            uid: {{ viewUser.uid }}
          </el-col>
        </el-row>
        <el-row align="middle" justify="start">
          <el-col :span="24">
            <Icon icon="mdi:leaf" class="font-16" color="green" />
            站龄: {{ formatRegisterTime(viewUser.registerTimestamp) }}
          </el-col>
        </el-row>
        <el-row align="middle" justify="start">
          <el-col>
            <Icon icon="tdesign:location" color="red" class="font-16" />
            IP属地: {{ viewUser.address }}
          </el-col>
        </el-row>
        <el-row align="middle" justify="start">
          <el-col>
            <Icon icon="mdi:crown" color="gold" />
            头衔: {{ viewUser.occupation }}
          </el-col>
        </el-row>
        <el-row align="middle" justify="center">
          <el-col :span="6" class="col-all-center">
            <el-statistic :value="viewUser.articleCount" />
          </el-col>
          <el-col :span="6" class="col-all-center">
            <el-statistic :value="viewUser.commentCount" />
          </el-col>
          <el-col :span="6" class="col-all-center">
            <el-statistic :value="viewUser.fansCount" />
          </el-col>
          <el-col :span="6" class="col-all-center">
            <el-statistic :value="viewUser.viewCount" />
          </el-col>
        </el-row>
        <el-row align="middle" justify="center">
          <el-col :span="6" class="col-all-center"> 文章</el-col>
          <el-col :span="6" class="col-all-center"> 评论</el-col>
          <el-col :span="6" class="col-all-center"> 粉丝</el-col>
          <el-col :span="6" class="col-all-center"> 访问量</el-col>
        </el-row>
        <el-row v-if="!user || viewUser.id !== user.id" align="middle" justify="center" class="mt-4">
          <el-col :span="12" class="col-all-center">
            <el-button round :color="viewUser.isFollowed ? 'green' : '#2196f3'" @click="followUser()">
              <Icon icon="ph:star" class="font-16" />
              {{ viewUser.isFollowed && viewUser.isMyFans ? '互相关注' : (viewUser.isFollowed ? '已关注' : '关注') }}
            </el-button>
          </el-col>
          <el-col :span="12" class="col-all-center">
            <el-button round color="#e91e63" @click="chat">
              <Icon icon="lets-icons:message" class="font-16" />
              私信
            </el-button>
          </el-col>
        </el-row>
      </div>
    </el-card>
    <el-card class="user-detail-div mt-3">
      <div class="font-weight-bold font-16 mt-2">成就</div>
      <el-divider />
      <div class="pl-4">
        <el-row align="middle" justify="center" class="text-left">
          <el-col :span="24">
            <Icon icon="tabler:thumb-up" class="font-18" />
            获得 {{ viewUser.articleLikeMeCount }} 次点赞
          </el-col>
        </el-row>
        <el-row align="middle" justify="center" class="text-left">
          <el-col :span="24">
            <Icon icon="iconamoon:comment-dots" class="font-18" />
            获得 {{ viewUser.articleCommentCount }} 次评论
          </el-col>
        </el-row>
        <el-row align="middle" justify="center" class="text-left">
          <el-col :span="24">
            <Icon icon="ph:star" class="font-18" />
            获得 {{ viewUser.articleCollectCount }} 次收藏
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { useUserStore } from '@/stores/user'
import actionApi from '@/api/action'
import { genderMap } from '@/utils/constant'
import { formatRegisterTime } from '@/utils/date'
import { checkIsLogin, toWait } from '@/utils/common'
import { Icon } from '@iconify/vue'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { ElMessage } from 'element-plus'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { IUserDetail } from '@/interface'

const props = defineProps<{
  viewUser: IUserDetail
}>()
const { viewUser } = toRefs(props)

const userStore = useUserStore()
const eventServer = EventServer.getInstance()

const user = computed(() => {
  return userStore.user
})

function followUser() {
  if (!checkIsLogin()) return
  actionApi.addOrUpdate({
    objId: viewUser.value?.id,
    objType: ObjectTypeEnum.USER,
    actionType: ActionTypeEnum.FOLLOW
  }).then(res => {
    viewUser.value.isFollowed = res.data
    if (res.data) {
      ElMessage({
        message: '关注成功',
        type: 'success',
        plain: true
      })
      viewUser.value.fansCount++
    } else {
      viewUser.value.fansCount--
    }
  })
}

function chat() {
  eventServer.emit(EventName.START_CHAT_WITH_USER, viewUser.value.id)
}
</script>

<style src="@/assets/css/user-center.scss" scoped />

