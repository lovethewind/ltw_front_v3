<template>
  <div class="comment-div">
    <!-- 评论详情 -->
    <div v-if="mainCount > 0">
      <!-- 评论数量 -->
      <div v-if="!notShowTotal">
        <span class="count">{{ count }} 评论</span>
        <a class="a-link ms-2" v-if="manualShowComment"
           @click="showOrHideCommentList()">{{ showCommentList ? '折叠↑' : '展开↓' }}</a>
      </div>
      <!-- 评论列表 -->
      <div v-if="!manualShowComment || showCommentList" class="comment-list-div"
           :style="maxHeight ? `max-height: ${maxHeight}px;overflow-y: auto;padding-right: 2px` : ''">
        <div
          v-for="(item, index) of commentList"
          :key="item.id"
          class="pt-2 d-flex comment-item"
        >
          <!-- 头像 -->
          <el-avatar size="default" class="comment-avatar" @click="router.push('/user/' + item.user.id)">
            <img :src="item.user.avatar" alt="">
          </el-avatar>
          <div class="comment-meta">
            <!-- 用户名 -->
            <div class="comment-user">
              <span>
                <a :href="'/user/' + item.user.id" target="_blank" class="comment-nickname a-link">
                  {{ item.user.nickname }}
                </a>
              </span>
              <span v-if="item.userId === objUserId" class="blogger-tag">博主</span>
              <div class="like-div">
                <!-- 删除 -->
                <a class="reply-btn" v-if="item.userId === loginUserId" @click="deleteComment(item, index)">
                  <Icon icon="material-symbols:delete-outline" class="font-18" />
                  删除
                </a>
                <!-- 点赞 -->
                <a class="reply-btn" :class="{'like-active': item.hasLike}" @click="like(item, index)">
                  <Icon :icon="item.hasLike ? 'tabler:thumb-up-filled' : 'tabler:thumb-up'"
                        :class="['font-18', {'like-active-icon': item.hasLike}]" />
                  ({{ item.likeCount }})
                </a>
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
            <div v-dompurify-html="item.content.replace('\n', '<br/>')" class="comment-content" />
            <!-- 二级回复列表 -->
            <div
              v-for="(childItem, childrenIndex) of item.children"
              :key="childItem.id"
              class="d-flex children-comment"
            >
              <!-- 头像 -->
              <el-avatar size="small" class="comment-avatar" @click="$router.push('/user/' + item.user.id)">
                <img :src="childItem.user.avatar" alt="">
              </el-avatar>
              <div class="reply-meta">
                <!-- 用户名 -->
                <div class="comment-user">
                <span>
                  <a :href="'/user/' + childItem.user.id" target="_blank"
                     class="comment-nickname a-link">{{ childItem.user.nickname }}</a>
                </span>
                  <span v-if="childItem.userId === objUserId" class="blogger-tag">博主</span>
                  <div class="like-div">
                    <!-- 删除 -->
                    <a class="reply-btn" v-if="childItem.userId === loginUserId"
                       @click="deleteComment(childItem, index)">
                      <Icon icon="material-symbols:delete-outline" />
                      删除
                    </a>
                    <!-- 点赞 -->
                    <a class="reply-btn" :class="{'like-active': childItem.hasLike}"
                       @click="like(childItem, index, true)">
                      <Icon :icon="childItem.hasLike ? 'tabler:thumb-up-filled' : 'tabler:thumb-up'"
                            :class="{'like-active-icon': childItem.hasLike}" />
                      ({{ childItem.likeCount }})
                    </a>
                    <!-- 回复 -->
                    <a class="reply-btn" @click="replyComment(childItem, index)">
                      <Icon icon="iconamoon:comment-dots" />
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
                    @<a :href="'/user/' + childItem.replyUser.id" target="_blank"
                        class="a-link">{{ childItem.replyUser.nickname }}</a>
                  </div>
                  <span v-dompurify-html="childItem.content.replace(/\n/g, '<br/>')" />
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
      </div>
      <!-- 加载按钮 -->
      <div v-if="!manualShowComment || showCommentList" class="load-wrapper">
        <load-more :total="mainCount" :no-more="mainCount <= commentList.length" @load="listComments()" />
      </div>
    </div>
    <!-- 没有评论提示 -->
    <div v-if="mainCount <= 0 && !notShowNoComment" style="padding:1.25rem;text-align:center">
      暂无评论, 赶快来抢沙发吧~
    </div>
  </div>
</template>

<style src="@/assets/css/comment.scss" scoped />

<script setup lang="ts">
import { ref, onMounted, toRefs, watch } from 'vue'
import { useRouter } from 'vue-router'
import commentApi from '@/api/comment'
import actionApi from '@/api/action'
import { checkIsLogin } from '@/utils/common'
import { covertTimeHowLongAgo } from '@/utils/date'
import { ActionTypeEnum, ObjectTypeEnum } from '@/enums'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import LoadMore from '@/components/base/LoadMore.vue'

const router = useRouter()
const emit = defineEmits(['reply-comment'])

const commentList = ref<any>([])
const currentPage = ref(1)
const pageSize = ref(10)
const count = ref(0)  // 总评论数量
const mainCount = ref(0)  // 一级评论数量
const showCommentList = ref(false)

const props = defineProps<{
  objId: string
  objType: ObjectTypeEnum
  objUserId: string
  loginUserId: string | undefined | null
  checkLogin: boolean
  maxHeight?: number | null
  notShowNoComment?: boolean  // 不显示没有评论提示
  notShowTotal?: boolean  // 不显示评论总数
  componentIndex?: number  // 组件索引, 用于区分多个评论组件
  manualShowComment?: boolean  // 手动查看评论
}>()

const {
  objId,
  objType,
  objUserId,
  loginUserId,
  checkLogin,
  maxHeight,
  notShowNoComment,
  notShowTotal,
  componentIndex,
  manualShowComment
} = toRefs(props)

onMounted(() => {
  listComments()
})

watch(objId, (newValue: string, oldValue: string) => {
  if (newValue !== oldValue) {
    commentList.value = []
    mainCount.value = 0
    count.value = 0
    currentPage.value = 1
    listComments()
  }
})

function showOrHideCommentList() {
  showCommentList.value = !showCommentList.value
}

function listComments() {
  commentApi.getCommentByArticleId(currentPage.value, pageSize.value, {
    objId: objId.value,
    objType: objType.value
  }).then(res => {
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
    objId: objId.value,
    objType: objType.value,
    replyUserId: item.userId,
    parentId: item.id,
    firstLevelId: item.firstLevelId,
    index: commentIndex,
    originContent: item.content,
    replyUser: item.user,
    componentIndex: componentIndex.value
  }
  if (item.parentId === 0) {  // 正在评论一级评论
    reply.firstLevelId = item.id
  }
  // 传值给上层及评论框
  emit('reply-comment', reply)
}

function continueLoad(item: any) {
  item.childrenCurrentPage = item.childrenCurrentPage || 1
  commentApi.getCommentByCommentId(item.childrenCurrentPage, 10, item.id).then(res => {
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

function like(item: any, index: number, isChildren = false) {
  // 判断登录
  if (!checkIsLogin()) return
  // 发送请求
  actionApi.addOrUpdate({
    objId: item.id,
    objType: ObjectTypeEnum.COMMENT,
    actionType: ActionTypeEnum.LIKE
  }).then(res => {
    // 判断是否点赞
    const isLike: boolean = res.data
    if (isChildren) { // 评论子评论
      commentList.value[index].children.map((temp: any) => {
        if (temp.id === item.id) {
          temp.hasLike = isLike
          temp.likeCount = isLike ? temp.likeCount + 1 : temp.likeCount - 1
        }
      })
    } else {
      commentList.value[index].hasLike = isLike
      commentList.value[index].likeCount = isLike ? commentList.value[index].likeCount + 1 : commentList.value[index].likeCount - 1
    }
  })
}

function deleteComment(item: any, index: number) {
  ElMessageBox.confirm('确定要删除该评论吗，删除后不可恢复？', '提示').then(() => {
    commentApi.deleteById(item.id).then(() => {
      ElMessage({
        message: '删除成功',
        type: 'success',
        plain: true
      })
      if (item.parentId === 0) { // 删除一级评论
        commentList.value.splice(index, 1)
        mainCount.value--
        count.value--
      } else { // 删除子评论
        commentList.value[index].children.splice(item.index, 1)
        commentList.value[index].childrenCount--
        count.value--
      }
    })
  })
}

defineExpose({
  reloadComment
})
</script>
