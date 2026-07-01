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
      <slot name="toolbar" />
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
import { EventName } from '@/event-server/event-name'
import { ChatMessageTypeEnum, MessageSendStatusEnum } from '@/enums/ws'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { uuid } from '@/utils/common'
import { getNow } from '@/utils/date'
import type { IEmojiChar } from '@/interface'

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
  const message: any = {
    tempId: uuid(),
    userId: user.value?.id || '',
    contactId: currentConversation.value?.contactId || '',
    contactType: currentConversation.value?.contactType as any,
    conversationId: currentConversation.value?.conversationId || '',
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
@import "@/assets/css/variables";

.message-input-wrapper {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 10px 14px 14px;
  background: #fff;
}

.message-input-container {
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
  overflow: visible;
  position: relative;
  border: 1px solid #dfe7ee;
  border-radius: 8px;
  background: #fbfcfd;
  transition: border-color 160ms ease, box-shadow 160ms ease;

  &:focus-within {
    border-color: #8bc5bb;
    box-shadow: 0 0 0 3px rgba(47, 143, 131, 0.12);
  }
}

.message-input-container-h5 {
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-end;
}

html.dark {
  .message-input-wrapper {
    background: $dark-main-color;
  }

  .message-input-container {
    background: #232425;
    border-color: $dark-border-color;

    &:focus-within {
      border-color: #37D18C;
      box-shadow: 0 0 0 3px rgba(55, 209, 140, 0.14);
    }
  }
}
</style>
