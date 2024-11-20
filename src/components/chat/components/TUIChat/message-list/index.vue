<template>
  <div class="tui-chat">
    <div id="tui-chat-main" class="tui-chat-main" @click="closeChatPop">
      <!-- Safe Tips -->
      <div v-if="isOfficial" class="tui-chat-safe-tips">
        <span>【安全提示】请勿轻信汇款、中奖等涉及钱款的信息，勿轻易拨打陌生电话，谨防上当受骗。</span>
        <a @click="closeSafeTip">关闭</a>
      </div>
      <!-- Message List -->
      <div id="messageScrollList" ref="messageListRef" class="tui-message-list" @scroll="loadMoreMessage">
        <p v-if="noMore" class="message-no-more">暂无更多消息</p>
        <div
          v-for="(item, index) in messageList"
          :key="item.tempId"
          ref="messageElementListRef"
          class="message-li"
        >
          <MessageTimestamp
            :currTime="item.createTime"
            :prevTime="index > 0 ? messageList[index - 1].createTime : null"
          />
          <div class="message-item">
            <MessageCard :message="item">
              <template #status>
                <MessageStatus :message="item" />
              </template>
              <template #content>
                <MessageText
                  v-if="item.messageType === ChatMessageTypeEnum.TEXT"
                  :content="item.content"
                />
                <MessageImage
                  v-if="item.messageType === ChatMessageTypeEnum.IMAGE"
                  :message-item="item"
                />
                <MessageVideo
                  v-if="item.messageType === ChatMessageTypeEnum.VIDEO"
                  :message-item="item"
                />
                <MessageFile
                  v-if="item.messageType === ChatMessageTypeEnum.FILE"
                  :message-item="item" />
                <!-- message tool -->
              </template>
            </MessageCard>
          </div>
        </div>
      </div>
      <ScrollButton
        ref="scrollButtonInstanceRef"
        @scrollToLatestMessage="scrollToLatestMessage"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import MessageText from './message-elements/message-text.vue'
import MessageTimestamp from './message-elements/message-timestamp.vue'
import ScrollButton from './scroll-button/index.vue'
import MessageCard from './message-elements/message-card.vue'
import MessageImage from './message-elements/message-image.vue'
import MessageVideo from './message-elements/message-video.vue'
import MessageFile from './message-elements/message-file.vue'
import MessageStatus from './message-elements/message-status.vue'
import { getBoundingClientRect, getScrollInfo } from '../../../utils'

import { IChatMessage, IChatSendMessage } from '@/interface/ws'
import { ChatMessageTypeEnum, MessageSendStatusEnum } from '@/enums/ws'
import chatApi from '@/api/chat'
import { useUserStore } from '@/stores/user'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { useChatStore } from '@/stores/chat'
import { throttle } from 'throttle-debounce'
import { uuid } from '@/utils/common'

const chatStore = useChatStore()

const currentConversation = computed(() => {
  return chatStore.currentConversation
})

const userStore = useUserStore()
const isOfficial = ref(true)
const eventServer = EventServer.getInstance()

const messageListRef = ref<HTMLElement>()
const messageList = ref<IChatMessage[]>([])
const nextMessageId = ref(null)
const messageElementListRef = ref<HTMLElement[] | null>()
const scrollButtonInstanceRef = ref<InstanceType<typeof ScrollButton>>()
const beforeHistoryGetScrollHeight = ref<number>(0)
const noMore = ref(false)
const firstLoaded = ref(false)
// temp message
const tempMessageMap = ref<Map<string, IChatSendMessage>>(new Map())

const user = computed(() => {
  return userStore.user
})

watch(currentConversation, () => {
  onCurrentConversationUpdate()
})

onMounted(async () => {
  eventServer.on(EventName.RECEIVE_CHAT_MESSAGE, onReceiveMessage)
  eventServer.on(EventName.INSERT_TEMP_MESSAGE, insertTempMessage)
  eventServer.on(EventName.RESEND_CHAT_MESSAGE, resendMessage)
  messageListRef.value?.addEventListener('scroll', handelScrollListScroll)
  await getHistoryMessageList()
  await nextTick(() => {
    scrollToLatestMessage()
  })
})

onUnmounted(() => {
  messageListRef.value?.removeEventListener('scroll', handelScrollListScroll)
  eventServer.off(EventName.RECEIVE_CHAT_MESSAGE, onReceiveMessage)
  eventServer.off(EventName.INSERT_TEMP_MESSAGE, insertTempMessage)
  eventServer.off(EventName.RESEND_CHAT_MESSAGE, resendMessage)
})


const handelScrollListScroll = throttle(150, (e: Event) => {
  scrollButtonInstanceRef.value?.judgeScrollOverOneScreen(e)
})

async function onCurrentConversationUpdate() {
  reset()
  await getHistoryMessageList()
  await nextTick(() => {
    scrollToLatestMessage()
  })
}

async function getHistoryMessageList() {
  if (noMore.value) return
  const res = await chatApi.getHistoryMessageList({
    conversationId: currentConversation.value?.conversationId,
    nextMessageId: nextMessageId.value
  })
  messageList.value = [...res.data.records, ...messageList.value]
  nextMessageId.value = res.data.nextMessageId
  noMore.value = res.data.noMore
  firstLoaded.value = true
  // After getting the historical messages, keep the scroll bar in the original position
  await nextTick(() => {
    beforeHistoryGetScrollHeight.value = messageListRef.value?.scrollHeight
  })
}

function onReceiveMessage(message: IChatMessage) {
  if (user.value.id === message.userId) {
    // If the message is a temporary message, replace it with the actual message
    const sendMessage = tempMessageMap.value.get(message.tempId)
    if (sendMessage) {
      tempMessageMap.value.delete(message.tempId)
      Object.assign(sendMessage, message)
    }
    return
  }
  if (currentConversation.value?.conversationId !== message.conversationId) return
  messageList.value.push(message)
  nextTick(() => {
    scrollToLatestMessage()
  })
}

function insertTempMessage(message: IChatSendMessage) {
  tempMessageMap.value.set(message.tempId, message)
  messageList.value.push(message)
  nextTick(() => {
    scrollToLatestMessage()
  })
}

function resendMessage(message: IChatSendMessage) {
  message.status = MessageSendStatusEnum.SENDING
  message.tempId = message.tempId || uuid()
  tempMessageMap.value.set(message.tempId, message)
  eventServer.emit(EventName.SEND_CHAT_MESSAGE, message)
}

async function loadMoreMessage() {
  if (firstLoaded.value && !noMore.value && messageListRef.value?.scrollTop === 0) {
    const currentScrollHeight = messageListRef.value?.scrollHeight
    await getHistoryMessageList()
    await nextTick(() => {
      messageListRef.value?.scrollTo(0, beforeHistoryGetScrollHeight.value - currentScrollHeight)
    })
  }
}

function closeSafeTip() {
  isOfficial.value = false
}

function scrollToLatestMessage() {
  const { scrollHeight } = getScrollInfo('messageScrollList')
  const { height } = getBoundingClientRect('messageScrollList')
  if (messageListRef.value) {
    messageListRef.value.scrollTop = scrollHeight - height
  }
}

function reset() {
  messageList.value = []
  nextMessageId.value = null
  firstLoaded.value = false
  noMore.value = false
}


defineExpose({
  scrollToLatestMessage
})
</script>

<style lang="scss" scoped src="./style/index.scss"></style>
