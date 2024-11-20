<template>
  <ToolbarItemContainer
    icon="akar-icons:video"
    title="发送视频"
    :needDialog="false"
    :iconWidth="20"
    :iconHeight="20"
    @onIconClick="onIconClick"
  >
    <div class="video-upload">
      <input
        ref="inputRef"
        title="视频"
        type="file"
        data-type="video"
        accept="video/*"
        @change="sendVideoInWeb"
      >
    </div>
  </ToolbarItemContainer>
</template>
<script lang="ts" setup>
import { ref, computed } from 'vue'
import ToolbarItemContainer from '../toolbar-item-container/index.vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import ossApi from '@/api/oss-api'
import { IChatSendMessage } from '@/interface/ws'
import { uuid } from '@/utils/common'
import { ChatMessageTypeEnum, MessageSendStatusEnum } from '@/enums/ws'
import { getNow } from '@/utils/date'
import { EventName } from '@/event-server/event-name'
import { uploadFile } from '@/utils/oss-upload'
import { EventServer } from '@/event-server'
import { UploadFileTypeEnum } from '@/enums'

const chatStore = useChatStore()
const userStore = useUserStore()
const eventServer = EventServer.getInstance()

const inputRef = ref()

const currentConversation = computed(() => {
  return chatStore.currentConversation
})
const user = computed(() => {
  return userStore.user
})

function onIconClick() {
  inputRef?.value?.click && inputRef?.value?.click()
}

function sendVideoInWeb(e: any) {
  if (e?.target?.files?.length <= 0) {
    return
  }
  sendVideoMessage(e?.target.files[0])
  e.target.value = ''
}

const onProgress = (message: IChatSendMessage) => (progressEvent: ProgressEvent) => {
  const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
  eventServer.emit(EventName.UPDATE_TEMP_MESSAGE, { tempId: message.tempId, progress: progress })
}

function sendVideoMessage(file: any) {
  if (!file) {
    return
  }
  ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.VIDEO,
    fileName: file.name
  }).then(res => {
    const message: IChatSendMessage = {
      tempId: uuid(),
      userId: user.value.id,
      contactId: currentConversation.value?.contactId,
      messageType: ChatMessageTypeEnum.VIDEO,
      contactType: currentConversation.value?.contactType,
      conversationId: currentConversation.value?.conversationId,
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
      message.attach[0].url = url
      eventServer.emit(EventName.SEND_CHAT_MESSAGE, message)
    })
  })
}
</script>

<style lang="scss" scoped>
@import "../../../../assets/styles/common";
</style>
