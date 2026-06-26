<template>
  <ToolbarItemContainer
    :icon="imageToolbarForShow.icon"
    :title="imageToolbarForShow.title"
    :iconWidth="20"
    :iconHeight="18"
    :needDialog="false"
    @onIconClick="onIconClick"
  >
    <div class="image-upload">
      <input
        ref="inputRef"
        title="图片"
        type="file"
        data-type="image"
        accept="image/gif,image/jpeg,image/jpg,image/png,image/bmp,image/webp"
        @change="sendImageInWeb"
      />
    </div>
  </ToolbarItemContainer>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import ToolbarItemContainer from '../toolbar-item-container/index.vue'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import ossApi from '@/api/oss-api'
import { uploadFile } from '@/utils/oss-upload'
import { ChatMessageTypeEnum, MessageSendStatusEnum } from '@/enums/ws'
import { uuid } from '@/utils/common'
import { getNow } from '@/utils/date'
import { UploadFileTypeEnum } from '@/enums'

const userStore = useUserStore()
const chatStore = useChatStore()

const eventServer = EventServer.getInstance()
const inputRef = ref<HTMLInputElement | null>(null)
const IMAGE_TOOLBAR_SHOW_MAP = {
  web_album: {
    icon: 'tabler:photo',
    title: '发送图片'
  }
}

const imageToolbarForShow = computed((): { icon: string; title: string } => {
  return IMAGE_TOOLBAR_SHOW_MAP['web_album']
})
const user = computed(() => {
  return userStore.user
})
const currentConversation = computed(() => {
  return chatStore.currentConversation
})

function onIconClick() {
  inputRef.value?.click()
}

function sendImageInWeb(e: any) {
  if (e?.target?.files?.length <= 0) {
    return
  }
  sendImageMessage(e.target.files[0])
  e.target.value = ''
}

const onProgress = (message: any) => (progressEvent: any) => {
  const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
  eventServer.emit(EventName.UPDATE_TEMP_MESSAGE, { tempId: message.tempId, progress: progress })
}

function sendImageMessage(file: File) {
  if (!file) {
    return
  }
  ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.IMAGE,
    fileName: file.name
  }).then(res => {
    const message: any = {
      tempId: uuid(),
      userId: user.value?.id || '',
      contactId: currentConversation.value?.contactId || '',
      messageType: ChatMessageTypeEnum.IMAGE,
      contactType: currentConversation.value?.contactType as any,
      conversationId: currentConversation.value?.conversationId || '',
      content: '',
      attach: [{
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type
      }],
      createTime: getNow(),
      status: MessageSendStatusEnum.SENDING,
      progress: 0
    }
    eventServer.emit(EventName.INSERT_TEMP_MESSAGE, message)
    uploadFile(res.data, file, onProgress(message)).then(url => {
      if (message.attach?.[0]) {
        message.attach[0].url = url
      }
      eventServer.emit(EventName.SEND_CHAT_MESSAGE, message)
    })
  })
}
</script>

<style lang="scss" scoped>
@import "../../../../assets/styles/common";
</style>
