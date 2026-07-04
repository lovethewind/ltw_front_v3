<template>
  <div v-if="viewUser" class="profile-detail-stack sticky-top-70">
    <section class="profile-detail-card">
      <div class="profile-detail-card__cover"></div>
      <div class="profile-detail-card__identity">
        <el-avatar class="profile-detail-card__avatar" :size="72" :src="viewUser.avatar" />
        <div class="profile-detail-card__meta">
          <div class="user-detail-name">
            {{ viewUser.nickname }}
            <GenderBadge :gender="viewUser.gender" />
          </div>
          <p>{{ viewUser.summary || '这个人很神秘，还没有写签名' }}</p>
        </div>
      </div>
      <div class="profile-info-chip-list">
        <div class="profile-info-chip">
          <Icon icon="mdi:id-card" />
          <span>UID {{ viewUser.uid }}</span>
        </div>
        <div class="profile-info-chip">
          <Icon icon="mdi:leaf" />
          <span>{{ formatRegisterTime(viewUser.registerTime) }}</span>
        </div>
        <div class="profile-info-chip">
          <Icon icon="tdesign:location" />
          <span>{{ viewUser.address || '未知' }}</span>
        </div>
      </div>
      <div class="profile-stat-grid">
        <div class="profile-stat-item">
          <strong>{{ viewUser.articleCount }}</strong>
          <span>文章</span>
        </div>
        <div class="profile-stat-item">
          <strong>{{ viewUser.commentCount }}</strong>
          <span>评论</span>
        </div>
        <div class="profile-stat-item">
          <strong>{{ viewUser.fansCount }}</strong>
          <span>粉丝</span>
        </div>
        <div class="profile-stat-item">
          <strong>{{ viewUser.viewCount }}</strong>
          <span>访问</span>
        </div>
      </div>
      <div v-if="!user || viewUser.id !== user.id" class="profile-action-row">
        <button class="profile-action-button is-follow" type="button" @click="followUser()">
          <Icon icon="ph:star" />
          {{
            viewUser.isFollowed && viewUser.isMyFans
              ? '互相关注'
              : viewUser.isFollowed
                ? '已关注'
                : '关注'
          }}
        </button>
        <button class="profile-action-button is-message" type="button" @click="chat">
          <Icon icon="lets-icons:message" />
          私信
        </button>
      </div>
    </section>
    <section class="profile-achievement-card">
      <div class="profile-card-title">
        <Icon icon="tabler:sparkles" />
        个人成就
      </div>
      <div class="profile-achievement-list">
        <div class="profile-achievement-item">
          <Icon icon="tabler:thumb-up" />
          <span>文章被点赞</span>
          <strong>{{ viewUser.articleLikeMeCount }}</strong>
        </div>
        <div class="profile-achievement-item">
          <Icon icon="iconamoon:comment-dots" />
          <span>文章被评论</span>
          <strong>{{ viewUser.articleCommentCount }}</strong>
        </div>
        <div class="profile-achievement-item">
          <Icon icon="ph:star" />
          <span>文章被收藏</span>
          <strong>{{ viewUser.articleCollectCount }}</strong>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { useUserStore } from '@/stores/user'
import actionApi from '@/api/action'
import { formatRegisterTime } from '@/utils/date'
import { checkIsLogin } from '@/utils/common'
import { Icon } from '@iconify/vue'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { ElMessage } from 'element-plus'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import type { IUserDetail } from '@/interface'
import GenderBadge from '@/components/base/GenderBadge.vue'

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
