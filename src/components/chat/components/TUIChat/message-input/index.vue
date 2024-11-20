<template>
  <div class="message-input-wrapper">
    <div class="message-input-container">
      <MessageInputEditor
        ref="editor"
        :placeholder="props.placeholder"
        :isMuted="props.isMuted"
        :muteText="props.muteText"
        :enableInput="props.enableInput"
        @sendMessage="sendMessage"
      />
      <MessageInputButton
        v-if="!props.isMuted"
        @sendMessage="sendMessage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MessageInputEditor from './message-input-editor.vue'
import MessageInputButton from './message-input-button.vue'
import { EventServer } from '@/event-server'
import { IChatSendMessage } from '@/interface/ws'
import { EventName } from '@/event-server/event-name'
import { ChatMessageTypeEnum, MessageSendStatusEnum } from '@/enums/ws'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { uuid } from '@/utils/common'
import { getNow } from '@/utils/date'
import { IEmojiChar } from '@/interface'

const props = defineProps({
  placeholder: {
    type: String,
    default: 'this is placeholder'
  },
  isMuted: {
    type: Boolean,
    default: true
  },
  muteText: {
    type: String,
    default: ''
  },
  enableInput: {
    type: Boolean,
    default: true
  },
  enableAt: {
    type: Boolean,
    default: true
  },
  enableDragUpload: {
    type: Boolean,
    default: true
  },
  enableTyping: {
    type: Boolean,
    default: true
  }
})

const userStore = useUserStore()
const chatStore = useChatStore()
const eventServer = EventServer.getInstance()
const editor = ref<InstanceType<typeof MessageInputEditor>>()

const user = computed(() => {
  return userStore.user
})
const currentConversation = computed(() => {
  return chatStore.currentConversation
})

async function sendMessage() {
  const editorContent = editor.value?.getEditorContent()
  if (!editorContent) return
  const message: IChatSendMessage = {
    tempId: uuid(),
    userId: user.value.id,
    contactId: currentConversation.value?.contactId,
    contactType: currentConversation.value?.contactType,
    conversationId: currentConversation.value?.conversationId,
    messageType: ChatMessageTypeEnum.TEXT,
    content: editorContent,
    attach: [],
    createTime: getNow(),
    status: MessageSendStatusEnum.SENDING
  }
  eventServer.emit(EventName.INSERT_TEMP_MESSAGE, message)
  eventServer.emit(EventName.SEND_CHAT_MESSAGE, message)
  chatStore.setCurrentConversationDraftText('')
  editor.value?.resetEditor()
}

function insertEmoji(emoji: IEmojiChar) {
  editor.value?.insertWordAtCursor(emoji.char)
}

const reEdit = (content: any) => {
  editor.value?.resetEditor()
  editor.value?.setEditorContent(content)
}

defineExpose({
  insertEmoji,
  reEdit
})
</script>

<style scoped lang="scss">
@import "../../../assets/styles/common";

.message-input-wrapper {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.message-input-container {
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
  overflow: hidden;
}

.message-input-container-h5 {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-end;
}
</style>
