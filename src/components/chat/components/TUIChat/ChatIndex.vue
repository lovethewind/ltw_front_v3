<template>
  <div class="chat">
    <div v-if="!currentConversation" class="tui-chat">
      <div class="tui-chat-default">
        <slot />
      </div>
    </div>
    <div v-if="currentConversation" class="tui-chat">
      <ChatHeader class="tui-chat-header" />
      <MessageList
        ref="messageListRef"
        class="tui-chat-message-list"
        @toggleMultipleSelectMode="toggleMultipleSelectMode"
      />
      <div v-if="isNotInGroup" :class="{'tui-chat-leave-group': true}">
        {{ leaveGroupReasonText }}
      </div>
      <MessageInputToolbar
        class="tui-chat-message-input-toolbar"
        :displayType="inputToolbarDisplayType"
        @insertEmoji="insertEmoji"
        @scrollToLatestMessage="scrollToLatestMessage"
      />
      <MessageInput
        ref="messageInputRef"
        class="tui-chat-message-input"
        :enableAt="featureConfig.InputMention"
        :isMuted="false"
        :muteText="'TUIChat.您已被管理员禁言'"
        :placeholder="'TUIChat.请输入消息'"
        :inputToolbarDisplayType="inputToolbarDisplayType"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import ChatHeader from './chat-header/index.vue'
import MessageList from './message-list/index.vue'
import MessageInput from './message-input/index.vue'
import MessageInputToolbar from './message-input-toolbar/index.vue'
import TUIChatConfig from './config'
import {useChatStore} from '@/stores/chat'

const chatStore = useChatStore()

const isNotInGroup = ref(false)
const notInGroupReason = ref<number>()
const isMultipleSelectMode = ref(false)
const inputToolbarDisplayType = ref<ToolbarDisplayType>('none')
const messageInputRef = ref()
const messageListRef = ref<InstanceType<typeof MessageList>>()
const featureConfig = TUIChatConfig.getFeatureConfig()

const currentConversation = computed(() => {
  return chatStore.currentConversation
})
const leaveGroupReasonText = computed<string>(() => {
  let text = ''
  switch (notInGroupReason.value) {
    case 4:
      text = 'TUIChat.您已被管理员移出群聊'
      break
    case 5:
      text = 'TUIChat.该群聊已被解散'
      break
    case 8:
      text = 'TUIChat.您已退出该群聊'
      break
    default:
      text = 'TUIChat.您已退出该群聊'
      break
  }
  return text
})

function insertEmoji(emojiObj: object) {
  messageInputRef.value?.insertEmoji(emojiObj)
}

function scrollToLatestMessage() {
  messageListRef.value?.scrollToLatestMessage()
}

function toggleMultipleSelectMode(visible?: boolean) {
  isMultipleSelectMode.value = visible === undefined ? !isMultipleSelectMode.value : visible
}
</script>

<style scoped lang="scss" src="./style/index.scss"></style>
