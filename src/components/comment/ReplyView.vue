<template>
  <div v-if="checkLogin && (user?.userRestriction?.commentForbidden)">
    <div class="reply-disabled">
      <a class="reply-disabled-close" v-if="isFixed" @click="reset()">
        关闭
      </a>
      <Icon icon="mdi:lock" class="font-30" />
      <div class="reply-disabled-text">
        当前用户被禁言中，无法评论
      </div>
    </div>
  </div>
  <div v-else class="reply-input-wrapper">
    <div v-if="showHeader" class="wl-header">
      <div class="wl-header-item">
        <label for="wl-nick">昵称</label>
        <input id="wl-nick" v-model="replyCommentForm.touristComment.nickname" class="wl-input wl-nick" name="nick"
               type="text">
      </div>
      <div class="wl-header-item">
        <label for="wl-mail">邮箱(可选)</label>
        <input id="wl-mail" v-model="replyCommentForm.touristComment.email" class="wl-input wl-mail" name="mail"
               type="email">
      </div>
    </div>
    <textarea
      ref="textareaRef"
      v-model="replyCommentForm.content"
      class="comment-textarea"
      :placeholder="!replyCommentForm.replyComment ? '想写点什么呢' : '回复 @' + replyCommentForm.replyComment.replyUser?.nickname + '：\n' + replyCommentForm.replyComment.originContent"
    />
    <div class="emoji-container">
      <el-popover placement="bottom" trigger="click" width="425">
        <template #default>
          <!-- 表情框 -->
          <emoji-view @addEmoji="addEmoji" />
        </template>
        <template #reference>
          <span class="emoji-btn">
            <Icon icon="mdi:emoji-outline" />
          </span>
        </template>
      </el-popover>
      <div style="margin-left:auto;margin-bottom: 5px">
        <el-button v-if="replyCommentForm.content.length > 0 || isFixed" @click="reset()">
          取消
        </el-button>
        <el-button type="primary" :disabled="btnDisabled" @click="insertReply()">
          提交
        </el-button>
      </div>
    </div>
  </div>
</template>

<style src="@/assets/css/reply.scss" scoped />

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'
import EmojiView from '@/components/base/EmojiView.vue'
import { useUserStore } from '@/stores/user'
import { checkIsLogin } from '@/utils/common'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { IEmojiChar, IEmojiCollect } from '@/interface'

const emit = defineEmits(['reply', 'cancel'])

const props = defineProps<{
  showHeader?: boolean
  checkLogin: boolean
  isFixed: boolean
}>()
const { showHeader, checkLogin, isFixed } = toRefs(props)

const userStore = useUserStore()

const textareaRef = ref<HTMLElement | null>(null)
const replyCommentForm = ref({
  content: '',
  touristComment: {
    nickname: null,
    email: null,
    avatar: null
  },
  replyComment: null
})
const chooseEmoji = ref(false)
const btnDisabled = ref(false)

const user = computed(() => {
  return userStore.user
})

function setReplyComment(val: any) {
  replyCommentForm.value.touristComment = Object.assign(replyCommentForm.value.touristComment, val.touristComment)
  replyCommentForm.value.replyComment = val.replyComment
  textareaRef.value?.focus()
}

function insertReply() {
  if (!replyCommentForm.value.content.trim()) {
    ElMessage({
      message: '内容不能为空',
      type: 'error',
      plain: true
    })
    return false
  }
  if (props.showHeader && !replyCommentForm.value.touristComment.nickname?.trim()) {
    ElMessage({
      message: '请填写昵称哦',
      type: 'error',
      plain: true
    })
    return false
  }
  btnDisabled.value = true
  if (checkLogin.value) {
    // 判断登录
    if (!checkIsLogin()) {
      btnDisabled.value = false
      return false
    }
  }
  emit('reply', replyCommentForm.value)
}

function addEmoji(val: IEmojiChar & IEmojiCollect) {
  if (val.char) {
    insertWordAtCursor(val.char)
  }
}

function insertWordAtCursor(word: string = '\n') {
  const element = textareaRef.value
  const start = element.selectionStart
  const end = element.selectionEnd
  // 插入换行符
  replyCommentForm.value.content = replyCommentForm.value.content.substring(0, start) + word + replyCommentForm.value.content.substring(end)
  // 移动光标到新位置
  setTimeout(() => {
    element.setSelectionRange(start + word.length, start + word.length)
    element.focus()
  }, 0)
}

function reset() {
  // 评论结束调用此方法
  replyCommentForm.value.content = ''
  replyCommentForm.value.replyComment = null
  chooseEmoji.value = false
  enableBtn()
  emit('cancel')
}

function enableBtn() {
  btnDisabled.value = false
}

defineExpose({
  reset,
  enableBtn,
  setReplyComment
})
</script>
