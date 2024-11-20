<template>
  <div />
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { getToken } from '@/utils/auth'
import { ElMessageBox, ElNotification } from 'element-plus'
import { EventName } from '@/event-server/event-name'
import { EventServer } from '@/event-server'
import { IChatSendMessage, IConversation, IMessage, ReceiveMessage } from '@/interface/ws'
import { ApplyStatusEnum, MessageSendStatusEnum, MessageShowTypeEnum, MessageTypeEnum } from '@/enums/ws'
import { dealChatMessageContent, dealNoticeMessageContent } from '@/components/ws/util'
import { useModalStore } from '@/stores/modal'

const eventServer = EventServer.getInstance()
const userStore = useUserStore()
const chatStore = useChatStore()
const modalStore = useModalStore()

const websocket = ref<WebSocket | null>(null)

onMounted(() => {
  eventServer.on(EventName.CONNECT_WS_SYSTEM, connectSystem)
  eventServer.on(EventName.DISCONNECT_WS_SYSTEM, disconnect)
  eventServer.on(EventName.SEND_CHAT_MESSAGE, sendChatMessage)
  eventServer.on(EventName.CHANGE_CURRENT_CONVERSATION, changeCurrentConversation)
})

onBeforeUnmount(() => {
  eventServer.off(EventName.CONNECT_WS_SYSTEM, connectSystem)
  eventServer.off(EventName.DISCONNECT_WS_SYSTEM, disconnect)
  eventServer.off(EventName.SEND_CHAT_MESSAGE, sendChatMessage)
  disconnect()
})

const user = computed(() => {
  return userStore.user
})


function connectSystem() {
  console.log('连接系统')
  const token = getToken()
  if (!token) return
  websocket.value = new WebSocket(`${import.meta.env.VITE_APP_WEBSOCKET_API}/connectSystem?token=${token}`)
  websocket.value.onopen = onConnect
  websocket.value.onerror = onError
  websocket.value.onmessage = onMessage
  websocket.value.onclose = onClose
}

function onConnect(e: Event) {
  console.log('连接成功', e)
}

function onError(e: Event) {
  console.log('连接错误', e)
}

function onMessage(e: MessageEvent) {
  const message: IMessage<ReceiveMessage> = JSON.parse(e.data)
  if (message.messageType == MessageTypeEnum.SYSTEM_IN_TIME) {
    if (message.showType === MessageShowTypeEnum.NOTIFICATION) {
      ElNotification({
        title: '📢 ' + message.message.title,
        message: message.message.content,
        offset: 50,
        duration: 5000
      })
    } else {
      ElMessageBox({
        title: message.message.title,
        message: message.message.content,
        closeOnClickModal: false
      })
    }
    return
  }
  if (message.messageType === MessageTypeEnum.CHAT_MESSAGE) {
    if (!modalStore.chatFlag // 聊天弹窗未打开
      || message.message.conversationId !== chatStore.currentConversation?.conversationId // 不是当前会话
      || ((message.message.conversationId === chatStore.currentConversation?.conversationId && chatStore.currentNavbar === 'contact')) // 是当前会话但在通讯录页面
      && message.message.userId !== user.value.id // 不是我发出的消息
      && message.message.status !== MessageSendStatusEnum.FAIL  // 不是发送失败
    ) {
      ElNotification({
        title: message.message.userProfile?.nickname || message.message.groupProfile?.name,
        message: dealChatMessageContent(message.message),
        dangerouslyUseHTMLString: true,
        offset: 50,
        duration: 5000
      })
    }
    eventServer.emit(EventName.RECEIVE_CHAT_MESSAGE, message.message)
    return
  }
  if (message.messageType === MessageTypeEnum.FRIEND_APPLY) {
    if (message.message.status === ApplyStatusEnum.PENDING) {
      ElNotification({
        title: '好友申请提醒',
        message: `【${message.message.userProfile.nickname}】申请加您为好友，快去看看吧`,
        offset: 50,
        duration: 5000
      })
    } else {
      ElNotification({
        title: '好友申请结果提醒',
        message: `【${message.message.userProfile.nickname}】${message.message.status === ApplyStatusEnum.AGREE ? '通过' : '拒绝'}了您的好友申请`,
        offset: 50,
        duration: 5000
      })
    }
    eventServer.emit(EventName.FLUSH_FRIEND_APPLY_LIST)
    eventServer.emit(EventName.FLUSH_FRIEND_LIST)
    return
  }
  if (message.messageType === MessageTypeEnum.NOTICE) {
    ElNotification({
      title: '📢 ' + message.message.title,
      message: dealNoticeMessageContent(message),
      dangerouslyUseHTMLString: true,
      offset: 50,
      duration: 5000
    })
  }
  eventServer.emit(EventName.FLUSH_NOTICE_UNREAD_COUNT)
}

function onClose(e: CloseEvent) {
  setTimeout(() => {
    connectSystem()
  }, 3000)
}

function disconnect() {
  websocket.value?.close()
}

function sendChatMessage(message: IChatSendMessage) {
  if (!message.contactId || !message.contactType || !message.conversationId) {
    message.status = MessageSendStatusEnum.FAIL
    return
  }
  const sendMessage: IMessage<IChatSendMessage> = {
    messageType: MessageTypeEnum.CHAT_MESSAGE,
    message: message
  }
  websocket.value?.send(JSON.stringify(sendMessage))
}

function changeCurrentConversation(conversation: IConversation) {
  const sendMessage: IMessage<IConversation> = {
    messageType: MessageTypeEnum.CHANGE_CURRENT_CONVERSATION,
    message: conversation
  }
  websocket.value?.send(JSON.stringify(sendMessage))
}
</script>

<style scoped>

</style>