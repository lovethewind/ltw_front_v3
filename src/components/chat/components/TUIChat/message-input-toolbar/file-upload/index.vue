<template>
  <ToolbarItemContainer
    icon="tabler:file"
    title="发送文件"
    :iconWidth="20"
    :iconHeight="18"
    :needDialog="false"
    @onIconClick="onIconClick"
  >
    <div class="file-upload">
      <input
        ref="inputRef"
        title="文件"
        type="file"
        data-type="file"
        accept="*"
        @change="sendFileInWeb"
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
import { EventServer } from '@/event-server'
import { uploadFile } from '@/utils/oss-upload'
import { UploadFileTypeEnum } from '@/enums'

const chatStore = useChatStore()
const userStore = useUserStore()
const eventServer = EventServer.getInstance()

const inputRef = ref<HTMLElement>()

const currentConversation = computed(() => {
  return chatStore.currentConversation
})
const user = computed(() => {
  return userStore.user
})

function onIconClick() {
  inputRef?.value && inputRef?.value?.click()
}

function sendFileInWeb(e: any) {
  if (e?.target?.files?.length <= 0) {
    return
  }
  sendFileMessage(e?.target.files[0])
  e.target.value = ''
}

const onProgress = (message: IChatSendMessage) => (progressEvent: ProgressEvent) => {
  const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
  eventServer.emit(EventName.UPDATE_TEMP_MESSAGE, { tempId: message.tempId, progress: progress })
}

function sendFileMessage(file: File) {
  ossApi.getUploadSignatureUrl({
    dirType: UploadFileTypeEnum.ATTACH,
    fileName: file.name
  }).then(res => {
    const message: IChatSendMessage = {
      tempId: uuid(),
      userId: user.value.id,
      contactId: currentConversation.value?.contactId,
      messageType: ChatMessageTypeEnum.FILE,
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
