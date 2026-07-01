<template>
  <div>
    <span v-if="message.status === MessageSendStatusEnum.SENDING">
      <Icon icon="eos-icons:loading" width="18" height="18" />
    </span>
    <!--    <span v-else-if="message.status === MessageSendStatusEnum.SUCCESS">-->
    <!--      <Icon icon="mdi:success-circle-outline" width="18" height="18" />-->
    <!--    </span>-->
    <span v-else-if="message.status === MessageSendStatusEnum.FAIL">
    <el-popconfirm :title="failStatusTitle" width="220" @confirm="resendMessage">
      <template #reference>
        <button class="fail-status-button" type="button" aria-label="查看发送失败原因">
          <Icon icon="material-symbols:error-outline" width="18" height="18" />
        </button>
      </template>
    </el-popconfirm>

    </span>
  </div>
</template>
<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { ChatMessageFailReasonEnum, MessageSendStatusEnum } from '@/enums/ws'
import { Icon } from '@iconify/vue'
import type { IChatMessage } from '@/interface/ws'
import { EventName } from '@/event-server/event-name'
import { EventServer } from '@/event-server'

interface IProps {
  message: IChatMessage
}

const props = defineProps<IProps>()
const { message } = toRefs(props)
const eventServer = EventServer.getInstance()
const failStatusTitle = computed(() => {
  return getFailStatusTitle(message.value.failReason)
})

/**
 * 重新发送失败消息。
 *
 * :return: 无返回值。
 */
function resendMessage(): void {
  eventServer.emit(EventName.RESEND_CHAT_MESSAGE, message.value)
}

/**
 * 根据失败原因生成失败提示。
 *
 * :param failReason: 消息失败原因。
 * :return: 失败提示文案。
 */
function getFailStatusTitle(failReason?: ChatMessageFailReasonEnum): string {
  if (failReason === ChatMessageFailReasonEnum.BLOCKED) {
    return '你们已存在拉黑关系，消息无法发送'
  }
  if (failReason === ChatMessageFailReasonEnum.SYSTEM_ERROR) {
    return '系统异常，消息发送失败'
  }
  return '消息发送失败，是否重新发送？'
}
</script>
<style scoped lang="scss">
.fail-status-button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  outline: none;
  color: #f04438;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    background: rgba(240, 68, 56, 0.1);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(240, 68, 56, 0.18);
  }
}
</style>
