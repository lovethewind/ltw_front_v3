<template>
  <!-- banner -->
  <div class="banner" :style="cover">
    <h1 class="banner-title">留言板</h1>
  </div>
  <el-card class="blog-container">
    <div ref="emptyReplyRef" class="empty-reply-div" v-show="replyShouldFixed">
      正在留言中
    </div>
    <!-- 留言框 -->
    <reply-view
      ref="replyRef"
      :show-header="!user"
      :check-login="false"
      :is-fixed="replyShouldFixed"
      @reply="addMessage"
      @cancel="cancelReply"
      :class="replyShouldFixed ? 'reply-fixed': ''"
    />
    <!-- 留言详情 -->
    <message-list-view
      ref="commentRef"
      :login-user-id="user?.id"
      :check-login="false"
      @reply-comment="replyComment"
    />
  </el-card>
</template>

<style src="@/assets/css/about.scss" scoped />

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useUserStore } from '@/stores/user'
import messageApi from '@/api/message'
import MessageListView from '@/components/comment/MessageListView.vue'
import ReplyView from '@/components/comment/ReplyView.vue'
import { ElMessage } from 'element-plus'
import CommentView from '@/components/comment/CommentView.vue'

const commonStore = useCommonStore()
const userStore = useUserStore()

const replyRef = ref<InstanceType<typeof ReplyView> | null>(null)
const commentRef = ref<InstanceType<typeof CommentView> | null>(null)
const emptyReplyRef = ref<HTMLElement | null>(null)
const currentReplyComment = ref<any>({})
const replyShouldFixed = ref(false)

const user = computed(() => {
  return userStore.user
})

const cover = computed(() => {
  return 'background: url(' + commonStore.pageCoverMap['link'].pageCover + ') center center / cover no-repeat'
})

function addMessage(item) {
  if (!user.value) {
    ElMessage({
      message: '正在提交, 请稍后...',
      type: 'success',
      plain: true
    })
  }
  const { replyUserId, parentId, firstLevelId, index, replyUser } = currentReplyComment.value
  const message = {
    nickname: item.touristComment.nickname,
    email: item.touristComment.email,
    avatar: item.touristComment.avatar,
    content: item.content,
    replyUserId: replyUserId || 0,
    parentId: parentId || 0,
    firstLevelId: firstLevelId || 0
  }
  messageApi.save(message).then(res => {
    // 查询最新留言
    ElMessage({
      message: '留言成功',
      type: 'success',
      plain: true
    })
    const add = res.data
    add.index = index
    add.replyUser = replyUser
    add.children = []
    add.childrenCount = 0
    if (user.value) { // 用户已登录
      add.user = Object.assign({}, user.value)
    } else {  // 游客
      add.user = Object.assign(item.touristComment, { avatar: add.avatar, address: add.address })
    }
    if (user.value && add.replyUserId === user.value.id) {  // 回复的是当前登录用户
      add.replyUser = Object.assign({}, user.value)
    }
    replyRef.value?.reset()
    replyRef.value?.setReplyComment({ touristComment: { avatar: add.avatar } })  // 给游客设置头像
    commentRef.value?.reloadComment(add)
    currentReplyComment.value = {}
  }).finally(() => {
    replyRef.value?.enableBtn()
  })
}

function replyComment(val: any) {
  if (!replyRef.value || !emptyReplyRef.value) return
  currentReplyComment.value = val
  const width = replyRef.value.$el.offsetWidth
  const height = replyRef.value.$el.offsetHeight
  replyShouldFixed.value = true
  replyRef.value.$el.style.width = width + 'px'
  emptyReplyRef.value.style.height = height + 'px'
  nextTick(() => {
    replyRef.value?.setReplyComment({ replyComment: val })
  })
}

function cancelReply() {
  currentReplyComment.value = {}
  replyShouldFixed.value = false
}
</script>