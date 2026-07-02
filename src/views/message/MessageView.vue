<template>
  <div class="message-board-page">
    <section class="message-hero" :style="cover">
      <div class="message-hero-mask" />
      <div class="message-hero-content">
        <span class="message-hero-kicker">Visitor Wall</span>
        <h1>访客墙</h1>
        <p>有什么想说的、建议、打个招呼，都可以留在这里。</p>
      </div>
    </section>

    <main class="message-board-container">
      <section class="message-intro">
        <div>
          <span class="message-section-label">Message Board</span>
          <h2>给这个小站留下一点回声</h2>
          <p>
            不必拘谨，可以聊文章、聊图片、提建议，或者只是留下今天路过的心情。
          </p>
        </div>
        <div class="message-stat-grid" aria-label="留言板说明">
          <div class="message-stat-card">
            <Icon icon="tabler:message-circle" />
            <span>开放留言</span>
          </div>
          <div class="message-stat-card">
            <Icon icon="tabler:user-heart" />
            <span>游客可写</span>
          </div>
          <div class="message-stat-card">
            <Icon icon="tabler:sparkles" />
            <span>友好交流</span>
          </div>
        </div>
      </section>

      <section class="message-composer-panel">
        <div class="message-panel-header">
          <div>
            <span class="message-section-label">Say Hello</span>
            <h2 class="message-composer-title">留下你的想法</h2>
          </div>
          <span class="message-panel-note">支持表情和回复</span>
        </div>
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
      </section>

      <section class="message-list-panel">
        <div class="message-panel-header">
          <div>
            <span class="message-section-label">Wall</span>
            <h2 class="message-list-title">大家的留言</h2>
          </div>
        </div>
        <!-- 留言详情 -->
        <message-list-view
          ref="commentRef"
          :login-user-id="user?.id"
          :check-login="false"
          @reply-comment="replyComment"
        />
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
.message-board-page {
  min-height: 100vh;
  background: #f6f7fb;
}

.message-hero {
  position: relative;
  min-height: 360px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  animation: header-effect 1s;
}

.message-hero-mask {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(20, 24, 32, 0.2), rgba(20, 24, 32, 0.72)),
    linear-gradient(90deg, rgba(18, 25, 38, 0.78), rgba(18, 25, 38, 0.18));
}

.message-hero-content {
  position: relative;
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;
  padding: 0 0 72px;
  color: #fff;
  animation: title-scale 1s;

  h1 {
    margin: 10px 0 12px;
    font-size: 3rem;
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: 0;
  }

  p {
    max-width: 520px;
    margin: 0;
    font-size: 1rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.86);
  }
}

.message-hero-kicker,
.message-section-label {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.message-hero-kicker {
  color: #a7f3d0;
}

.message-board-container {
  width: min(980px, calc(100% - 32px));
  margin: -44px auto 56px;
  position: relative;
  z-index: 1;
}

.message-intro,
.message-composer-panel,
.message-list-panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(30, 41, 59, 0.08);
  border-radius: 8px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
}

.message-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 28px;
  align-items: center;
  padding: 28px;

  h2 {
    margin: 8px 0 10px;
    color: #1f2937;
    font-size: 1.45rem;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: #667085;
    line-height: 1.8;
    font-size: 0.95rem;
  }
}

.message-section-label {
  color: #0f766e;
}

.message-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.message-stat-card {
  min-height: 92px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  color: #475569;
  font-size: 0.86rem;

  svg {
    width: 24px;
    height: 24px;
    color: #0f766e;
  }
}

.message-composer-panel,
.message-list-panel {
  margin-top: 18px;
  padding: 24px 28px;
}

.message-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  h2 {
    margin: 6px 0 0;
    color: #1f2937;
    font-size: 1.18rem;
    line-height: 1.4;
  }
}

.message-panel-note {
  flex: 0 0 auto;
  color: #64748b;
  background: #eef6f4;
  border: 1px solid #cfe7e2;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.78rem;
}

.empty-reply-div {
  border: 1px dashed #8dd8ca;
  background: #f2fbf8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  border-radius: 8px;
  margin: 10px 0;
}

:deep(.reply-input-wrapper) {
  border-color: #d8e4e1;
  border-radius: 8px;
  background: #fbfefd;
}

:deep(.comment-div .count) {
  display: inline-flex;
  align-items: center;
  padding: 0 0 12px;
  color: #1f2937;
}

:deep(.comment-item) {
  padding: 16px 0 18px;
  margin-bottom: 0;
  border-top: 1px solid #edf0f3;
}

:deep(.comment-item:first-of-type) {
  border-top: 0;
}

:deep(.comment-content) {
  border-bottom: 0;
}

:deep(.children-comment) {
  background: #f8fafc;
  margin-top: 12px;
  padding: 14px;
}

html.dark .message-board-page {
  background: #1d1e1f;
}

html.dark .message-hero-mask {
  background:
    linear-gradient(180deg, rgba(8, 13, 22, 0.36), rgba(8, 13, 22, 0.84)),
    linear-gradient(90deg, rgba(8, 13, 22, 0.86), rgba(8, 13, 22, 0.24));
}

html.dark .message-intro,
html.dark .message-composer-panel,
html.dark .message-list-panel {
  background: rgba(24, 27, 32, 0.96);
  border-color: #2f3b4f;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
}

html.dark .message-intro h2,
html.dark .message-panel-header h2 {
  color: #f4f6f8;
}

html.dark .message-intro p {
  color: #b7c0ca;
}

html.dark .message-section-label,
html.dark .message-hero-kicker {
  color: #8dd8ca;
}

html.dark .message-stat-card {
  background: #121821;
  border-color: #2f3b4f;
  color: #c8d2df;

  svg {
    color: #8dd8ca;
  }
}

html.dark .message-panel-note {
  background: #172b2a;
  border-color: #245451;
  color: #bddbd7;
}

html.dark .empty-reply-div {
  background: #172b2a;
  border-color: #245451;
  color: #bddbd7;
}

:global(html.dark .message-board-page .reply-input-wrapper) {
  border-color: #2f3b4f !important;
  background: #1d1e1f !important;
}

:global(html.dark .message-board-page .wl-header) {
  border-color: #2f3b4f;
}

:global(html.dark .message-board-page .wl-header label) {
  color: #d6dbe5;
}

:global(html.dark .message-board-page .wl-input),
:global(html.dark .message-board-page .comment-textarea) {
  background: #1d1e1f !important;
  color: #f4f6f8;
}

:global(html.dark .message-board-page .wl-input::placeholder),
:global(html.dark .message-board-page .comment-textarea::placeholder) {
  color: #8e98a8;
}

:global(html.dark .message-board-page .comment-item) {
  border-top-color: #2f3b4f;
}

:global(html.dark .message-board-page .comment-div .count) {
  color: #f4f6f8;
}

:global(html.dark .message-board-page .comment-content) {
  color: #e5eaf3;
}

:global(html.dark .message-board-page .comment-nickname) {
  color: #d6dbe5;
}

:global(html.dark .message-board-page .comment-info) {
  color: #8e98a8;
}

:global(html.dark .message-board-page .reply-btn) {
  color: #9fb1c7;
}

:global(html.dark .message-board-page .children-comment) {
  background: #121821;
}

@media (max-width: 768px) {
  .message-hero {
    min-height: 300px;
  }

  .message-hero-content {
    padding-bottom: 56px;

    h1 {
      font-size: 2.25rem;
    }
  }

  .message-board-container {
    width: min(100% - 20px, 980px);
    margin-top: -32px;
  }

  .message-intro {
    grid-template-columns: 1fr;
    padding: 22px;
  }

  .message-stat-grid {
    grid-template-columns: 1fr;
  }

  .message-stat-card {
    min-height: 72px;
    flex-direction: row;
  }

  .message-composer-panel,
  .message-list-panel {
    padding: 20px;
  }

  .message-panel-header {
    display: block;
  }

  .message-panel-note {
    display: inline-flex;
    margin-top: 12px;
  }
}
</style>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useUserStore } from '@/stores/user'
import messageApi from '@/api/message'
import MessageListView from '@/components/comment/MessageListView.vue'
import ReplyView from '@/components/comment/ReplyView.vue'
import { ElMessage } from 'element-plus'
import CommentView from '@/components/comment/CommentView.vue'
import { Icon } from '@iconify/vue'

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
  const pageCover = commonStore.pageCoverMap.message?.pageCover || commonStore.pageCoverMap.about?.pageCover || commonStore.pageCoverMap.link?.pageCover
  return 'background: url(' + pageCover + ') center center / cover no-repeat'
})

function addMessage(item: any) {
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
