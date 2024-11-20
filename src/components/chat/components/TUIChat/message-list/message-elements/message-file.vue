<template>
  <div class="file-message-container">
    <div class="file-box">
      <div class="file-name-box">
        <Icon icon="tdesign:attach" />
        <el-tooltip :content="messageItem.attach[0].name" placement="top" effect="light">
          <span class="ellipsis file-name">{{ messageItem.attach[0].name }}</span>
        </el-tooltip>
      </div>
      <div class="file-size-box">
        <div class="file-size">{{ transformSize(messageItem.attach[0].size) }}</div>
        <div v-if="messageItem.status === MessageSendStatusEnum.SUCCESS" class="file-download"
             @click="downloadFile(messageItem.attach[0].url)">
          <Icon icon="ic:round-download" />
          下载
        </div>
      </div>
    </div>
    <div v-if="messageItem.status === MessageSendStatusEnum.SENDING" class="overlay">
      <div class="progress-bar">
        <el-progress :percentage="messageItem.progress" type="circle" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, toRefs } from 'vue'
import { MessageSendStatusEnum } from '@/enums/ws'
import { IChatMessage, IChatUpdateMessage } from '@/interface/ws'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { Icon } from '@iconify/vue'
import { downloadFile, transformSize } from '@/utils/common'

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
@import "@/assets/css/variables";

.file-message-container {
  display: flex;
  flex-direction: row;
  position: relative;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
  background: #eee;

  .file-box {
    max-width: 100%;

    .file-name-box {
      display: flex;
      align-items: center;
      padding-bottom: 5px;
      border-bottom: 1px dashed #ccc;

      .file-name {
        max-width: 95%;
      }
    }

    .file-size-box {
      display: flex;
      align-items: center;
      font-size: 12px;
      margin-top: 5px;

      .file-size {
        display: inline-flex;
        align-items: center;
        justify-content: start;
        flex: 1;
      }

      .file-download {
        display: inline-flex;
        align-items: center;
        justify-content: end;
        cursor: pointer;
        flex: 1;
      }
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

    :deep(.el-progress-circle) {
      height: 60px !important;
      width: 60px !important;
    }
  }
}

html.dark {
  .file-message-container {
    background: transparent;
    color: #eee;
    border-color: $dark-border-color;
  }
}
</style>
