<template>
  <div class="message-video">
    <video
      class="message-video-box"
      :src="messageItem.attach[0].url"
      :controls="messageItem.status === MessageSendStatusEnum.SUCCESS"
      preload="metadata"
    />
    <div v-if="messageItem.status === MessageSendStatusEnum.SENDING" class="overlay">
      <div class="progress-bar">
        <el-progress :percentage="messageItem.progress" type="circle" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { toRefs, onMounted, onUnmounted } from 'vue'
import { MessageSendStatusEnum } from '@/enums/ws'
import { IChatMessage, IChatUpdateMessage } from '@/interface/ws'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'

interface IProps {
  messageItem: IChatMessage
}

const props = defineProps<IProps>()
const { messageItem } = toRefs(props)
const eventServer = EventServer.getInstance()


onMounted(() => {
  if (messageItem.value?.status === MessageSendStatusEnum.SENDING) {
    eventServer.on(EventName.UPDATE_TEMP_MESSAGE, updateMessage)
  }
})

onUnmounted(() => {
  eventServer.off(EventName.UPDATE_TEMP_MESSAGE, updateMessage)
})

function updateMessage(message: IChatUpdateMessage) {
  if (message.tempId !== messageItem.value.tempId) return
  messageItem.value.progress = message.progress
}
</script>

<style lang="scss" scoped>
@import "../../../../assets/styles/common";

.message-video {
  position: relative;
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-radius: 5px;

  &-box {
    max-width: min(calc(100vw - 180px), 300px);
    font-size: 0;

    video {
      max-width: min(calc(100vw - 180px), 300px);
      max-height: min(calc(100vw - 180px), 300px);
      width: inherit;
      height: inherit;
      border-radius: 10px;
    }
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    color: white;

    :deep(.el-progress__text) {
      color: white;
    }
  }
}
</style>
