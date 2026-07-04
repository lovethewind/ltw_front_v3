<template>
  <div v-if="viewUser">
    <el-card class="follow-panel user-container">
      <div class="follow-hero">
        <div class="follow-hero__liquid"></div>
        <div class="follow-hero__content">
          <span class="follow-hero__icon">
            <Icon icon="tabler:users-group" />
          </span>
          <div>
            <div class="follow-hero__label">关系网络</div>
            <h3>{{ relationTitle }}</h3>
            <p>{{ relationSubtitle }}</p>
          </div>
        </div>
        <div class="follow-hero__meta">
          <strong>{{ total }}</strong>
          <span>{{ showType === 1 ? '关注中' : '位粉丝' }}</span>
        </div>
      </div>

      <div class="follow-tabs" role="tablist" aria-label="关注关系">
        <button
          v-for="item in followTypeList"
          :key="item.type"
          class="follow-tab"
          :class="{ 'is-active': showType === item.type }"
          type="button"
          role="tab"
          :aria-selected="showType === item.type"
          @click="orderTypeChange(item.type)"
        >
          <Icon :icon="item.icon" />
          <span>{{ item.name }}</span>
        </button>
      </div>

      <div v-if="followerList.length > 0" class="follow-grid">
        <article v-for="follower in followerList" :key="follower.id" class="follow-card">
          <a :href="'/user/' + follower.id" target="_blank" class="follow-card__avatar-ring">
            <el-avatar :src="follower.avatar" :size="58" />
          </a>
          <div class="follow-card__body">
            <div class="follow-card__topline">
              <a :href="'/user/' + follower.id" target="_blank" class="follow-card__name">
                {{ follower.nickname }}
              </a>
              <span v-if="follower.isFollowed && follower.isMyFans" class="follow-card__badge">
                互相关注
              </span>
            </div>
            <p>{{ follower.summary || '暂时还没有留下简介，等一句风经过。' }}</p>
            <div class="follow-card__chips">
              <span v-if="follower.isFollowed">
                <Icon icon="tabler:heart-check" />
                已关注
              </span>
              <span v-if="follower.isMyFans">
                <Icon icon="tabler:sparkles" />
                你的粉丝
              </span>
              <span v-if="!follower.isFollowed && !follower.isMyFans">
                <Icon icon="tabler:user-plus" />
                新关系
              </span>
            </div>
          </div>
          <button
            v-if="follower.id !== user?.id"
            class="follow-action-button"
            :class="getFollowActionClass(follower)"
            type="button"
            @click="followUser(follower)"
          >
            <Icon :icon="getFollowActionIcon(follower)" />
            <span>{{ getFollowActionText(follower) }}</span>
          </button>
        </article>
      </div>
      <div v-else-if="!loading" class="follow-empty">
        <Icon icon="tabler:user-heart" />
        <strong>{{ emptyTitle }}</strong>
        <span>{{ emptyDescription }}</span>
      </div>
      <load-more
        v-if="followerList.length > 0 || loading"
        :loading="loading"
        :no-more="noMore"
        :total="total"
        :show-no-more="false"
        :loading-rows="8"
        @load="infiniteHandler"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRefs } from 'vue'
import { useUserStore } from '@/stores/user'
import LoadMore from '@/components/base/LoadMore.vue'
import actionApi from '@/api/action'
import { checkIsLogin } from '@/utils/common'
import { ElMessage } from 'element-plus'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { Icon } from '@iconify/vue'
import type { IUserDetail } from '@/interface'

interface IFollowUser {
  id: string
  nickname: string
  avatar: string
  summary?: string
  isMyFans: boolean
  isFollowed: boolean
}

const userStore = useUserStore()

const props = defineProps<{
  viewUser: IUserDetail
}>()
const { viewUser } = toRefs(props)


const followTypeList = [
  {
    type: 1,
    name: '关注',
    icon: 'tabler:user-check'
  },
  {
    type: 2,
    name: '粉丝',
    icon: 'tabler:user-heart'
  }
]

const showType = ref(1)
const loading = ref(false)
const followerList = ref<IFollowUser[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const user = computed(() => {
  return userStore.user
})
const noMore = computed(() => {
  return followerList.value.length >= total.value
})
const relationTitle = computed(() => {
  return showType.value === 1 ? '正在关注' : '关注者'
})
const relationSubtitle = computed(() => {
  const nickname = viewUser.value.nickname || 'TA'
  return showType.value === 1
    ? nickname + ' 正在关注这些有趣的人'
    : '这些人正在关注 ' + nickname + ' 的动态'
})
const emptyTitle = computed(() => {
  return showType.value === 1 ? '还没有关注任何人' : '还没有粉丝'
})
const emptyDescription = computed(() => {
  return showType.value === 1 ? '遇到喜欢的作者时，可以先把他们收进这里。' : '继续发布内容，新的互动会慢慢抵达。'
})

onMounted(() => {
  infiniteHandler()
})

/**
 * 分页加载当前用户的关注或粉丝列表。
 *
 * :return: 无返回值。
 */
function infiniteHandler(): void {
  loading.value = true
  const func = viewUser.value.id === user.value?.id ? actionApi.getUserActionList : actionApi.getActionList
  const sendData: any = {
    actionType: ActionTypeEnum.FOLLOW,
    objType: ObjectTypeEnum.USER
  }
  if (showType.value === 1) { // 该用户关注的人
    sendData.userId = viewUser.value?.id
  } else { // 粉丝
    sendData.objId = viewUser.value?.id
  }
  func(currentPage.value, pageSize.value, sendData, {}).then(res => {
    if (res.data.records.length) {
      currentPage.value++
      followerList.value.push(...res.data.records)
      total.value = res.data.total
    }
  }).finally(() => {
    loading.value = false
  })
}

/**
 * 切换指定用户的关注状态，并同步当前卡片的状态展示。
 *
 * :param targetUser: 当前操作的用户卡片数据。
 * :return: 无返回值。
 */
function followUser(targetUser: IFollowUser): void {
  if (!checkIsLogin()) return
  actionApi.addOrUpdate({
    objId: targetUser.id,
    objType: ObjectTypeEnum.USER,
    actionType: ActionTypeEnum.FOLLOW
  }).then(res => {
    targetUser.isFollowed = res.data
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

/**
 * 切换关注关系类型，并重置分页后重新加载列表。
 *
 * :param val: 当前选择的关系类型。
 * :return: 无返回值。
 */
function orderTypeChange(val: number): void {
  if (showType.value === val && followerList.value.length > 0) return
  showType.value = val
  currentPage.value = 1
  followerList.value = []
  total.value = 0
  infiniteHandler()
}

/**
 * 获取关注按钮的文案。
 *
 * :param targetUser: 当前用户卡片数据。
 * :return: 当前按钮文案。
 */
function getFollowActionText(targetUser: IFollowUser): string {
  if (targetUser.isFollowed && targetUser.isMyFans) return '互相关注'
  return targetUser.isFollowed ? '取消关注' : '关注'
}

/**
 * 获取关注按钮的图标。
 *
 * :param targetUser: 当前用户卡片数据。
 * :return: 当前按钮图标名称。
 */
function getFollowActionIcon(targetUser: IFollowUser): string {
  if (targetUser.isFollowed && targetUser.isMyFans) return 'tabler:heart-handshake'
  return targetUser.isFollowed ? 'tabler:user-minus' : 'tabler:user-plus'
}

/**
 * 获取关注按钮的状态类名。
 *
 * :param targetUser: 当前用户卡片数据。
 * :return: 当前按钮状态类名。
 */
function getFollowActionClass(targetUser: IFollowUser): string {
  if (targetUser.isFollowed && targetUser.isMyFans) return 'is-mutual'
  return targetUser.isFollowed ? 'is-followed' : 'is-new'
}
</script>

<style src="@/assets/css/user-center.scss" scoped />
