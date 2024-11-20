<template>
  <div class="comment-div">
    <!-- 评论数量 -->
    <div class="count">{{ count }} 留言</div>
    <!-- 评论详情 -->
    <div v-if="mainCount > 0">
      <!-- 评论列表 -->
      <div
        v-for="(item, index) of commentList"
        :key="item.id"
        class="pt-2 d-flex comment-item"
      >
        <!-- 头像 -->
        <el-avatar size="default" class="comment-avatar"
                   @click="item.userId === 0 ? '' : router.push('/user/' + item.user.id)">
          <img :src="item.user.avatar" alt="">
        </el-avatar>
        <div class="comment-meta">
          <!-- 用户名 -->
          <div class="comment-user">
            <span>
              <span v-if="item.userId === 0" class="comment-nickname">{{ item.user.nickname }}</span>
              <a v-else :href="'/user/' + item.user.id" target="_blank" class="comment-nickname a-link">
                {{ item.user.nickname }}
              </a>
              <span v-if="loginUserId && item.userId === loginUserId" class="blogger-tag">我</span>
            </span>
            <div class="like-div">
              <!-- 回复 -->
              <a class="reply-btn" @click="replyComment(item, index)">
                <Icon icon="iconamoon:comment-dots" class="font-18" />
                回复
              </a>
            </div>
          </div>
          <!-- 信息 -->
          <div class="comment-info">
            <!-- 楼层 -->
            <span class="me-1">{{ mainCount - index }}楼</span>
            <!-- 发表时间 -->
            <span class="me-1">{{ covertTimeHowLongAgo(item.createTime) }}</span>
            <!-- ip属地 -->
            <span class="me-1">IP属地: {{ item.user.address }}</span>
          </div>
          <!-- 评论内容 -->
          <div v-dompurify-html="item.content" class="comment-content" />
          <!-- 二级回复列表 -->
          <div
            v-for="(childItem, childrenIndex) of item.children"
            :key="childItem.id"
            class="d-flex children-comment"
          >
            <!-- 头像 -->
            <el-avatar size="small" class="comment-avatar" @click="childItem.userId === 0 ? '' : router.push('/user/' + childItem.user.id)">
              <img :src="childItem.user.avatar" alt="">
            </el-avatar>
            <div class="reply-meta">
              <!-- 用户名 -->
              <div class="comment-user">
                <span>
                  <span v-if="childItem.userId === 0" class="comment-nickname">{{ childItem.user.nickname }}</span>
                  <a v-else :href="'/user/' + childItem.user.id" target="_blank"
                     class="comment-nickname a-link">{{ childItem.user.nickname }}</a>
                </span>
                <span v-if="loginUserId && childItem.userId === loginUserId" class="blogger-tag">我</span>
                <div class="like-div">
                  <!-- 回复 -->
                  <a class="reply-btn" @click="replyComment(childItem, index)">
                    <Icon icon="iconamoon:comment-dots" class="font-18" />
                    回复
                  </a>
                </div>
              </div>
              <!-- 信息 -->
              <div class="comment-info">
                <!-- 楼层 -->
                <span class="me-1">{{ item.childrenCount - childrenIndex }}楼</span>
                <!-- 发表时间 -->
                <span class="me-1">
                  {{ covertTimeHowLongAgo(childItem.createTime) }}
                </span>
                <!-- ip属地 -->
                <span class="me-1">IP属地: {{ childItem.user.address }}</span>
              </div>
              <!-- 回复内容 -->
              <div class="comment-content">
                <!-- 回复用户信息 -->
                <div v-if="childItem.replyUser && childItem.parentId !== childItem.firstLevelId"
                     class="reply-user-info">
                  @<span v-if="childItem.replyUserId === 0">{{ childItem.replyUser.nickname }}</span>
                  <a v-else :href="'/user/' + childItem.replyUser.id" target="_blank"
                     class="a-link">{{ childItem.replyUser.nickname }}</a>
                </div>
                <span v-dompurify-html="childItem.content" />
              </div>
            </div>
          </div>
          <!-- 回复数量 -->
          <div v-show="item.childrenCount > 3" class="mb-3 children-comment-op">
            共
            <b>{{ item.childrenCount }}</b>
            条回复
            <span class="continue-load" v-if="item.children.length < item.childrenCount" @click="continueLoad(item)">
              继续加载
            </span>
            <span v-else class="continue-load" @click="toggleCollapse(item)">
              收起
            </span>
          </div>
        </div>
      </div>
      <!-- 加载按钮 -->
      <div class="load-wrapper">
        <load-more :total="mainCount" :no-more="mainCount <= commentList.length" @load="listMessages()" />
      </div>
    </div>
    <!-- 没有评论提示 -->
    <div v-else style="padding:1.25rem;text-align:center">
      暂无留言, 快说点什么吧~
    </div>
  </div>
</template>

<style src="@/assets/css/comment.scss" scoped />

<script setup lang="ts">
import { ref, onMounted, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import messageApi from '@/api/message'
import { checkIsLogin } from '@/utils/common'
import { covertTimeHowLongAgo } from '@/utils/date'
import { Icon } from '@iconify/vue'
import LoadMore from '@/components/base/LoadMore.vue'

const router = useRouter()
const emit = defineEmits(['reply-comment'])

const commentList = ref<any>([])
const currentPage = ref(1)
const pageSize = ref(10)
const count = ref(0)  // 总评论数量
const mainCount = ref(0)  // 一级评论数量

const props = defineProps<{
  loginUserId: string | undefined,
  checkLogin: boolean
}>()

const { loginUserId, checkLogin } = toRefs(props)

onMounted(() => {
  listMessages()
})

function listMessages() {
  messageApi.getPageList(currentPage.value, pageSize.value).then(res => {
    if (res.data.records.length) {
      res.data.records.map((item: any) => {
        item.children = item.children?.slice(0, 3) || []
      })
      commentList.value.push(...res.data.records)
      count.value = res.data.total
      mainCount.value = res.data.mainTotal
      currentPage.value++
    }
  })
}

function replyComment(item: any, commentIndex: number) {
  if (checkLogin.value) {
    if (!checkIsLogin()) return
  }
  const reply = {
    nickname: item.nickname,
    email: item.email,
    avatar: item.avatar,
    replyUserId: item.userId,
    parentId: item.id,
    firstLevelId: item.firstLevelId,
    index: commentIndex,
    originContent: item.content,
    replyUser: item.user
  }
  if (item.parentId === 0) {  // 正在评论一级评论
    reply.firstLevelId = item.id
  }
  // 传值给上层及评论框
  emit('reply-comment', reply)
}

function continueLoad(item: any) {
  item.childrenCurrentPage = item.childrenCurrentPage || 1
  messageApi.getChildrenMessageByMessageId(item.childrenCurrentPage, 10, item.id).then(res => {
    if (res.data.records.length) {
      if (item.childrenCurrentPage === 1) {
        item.children = res.data.records
      } else {
        item.children.push(...res.data.records)
      }
      item.childrenCurrentPage++
    }
  })
}

function toggleCollapse(item: any) {
  item.children = item.children.slice(0, 3)
  item.childrenCurrentPage = 1
}

function reloadComment(add: any) {
  add.children = add.children || []
  if (add.parentId === 0) { // 评论的是文章等
    commentList.value = [add, ...commentList.value]
    mainCount.value++
    count.value++
  } else { // 子评论
    if (commentList.value[add.index].children.length <= 3) {
      commentList.value[add.index].children = [add, ...commentList.value[add.index].children].slice(0, 3)
    } else {
      commentList.value[add.index].children = [add, ...commentList.value[add.index].children]
    }
    commentList.value[add.index].childrenCount++
    count.value++
  }
}

defineExpose({
  reloadComment
})
</script>
