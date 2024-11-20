<template>
  <div>
    <span v-if="message.status === MessageSendStatusEnum.SENDING">
      <Icon icon="eos-icons:loading" width="18" height="18" />
    </span>
    <!--    <span v-else-if="message.status === MessageSendStatusEnum.SUCCESS">-->
    <!--      <Icon icon="mdi:success-circle-outline" width="18" height="18" />-->
    <!--    </span>-->
    <span v-else-if="message.status === MessageSendStatusEnum.FAIL">
    <el-popconfirm title="确定要重新发送吗" width="160" @confirm="resendMessage">
      <template #reference>
        <Icon icon="material-symbols:error-outline" color="red" width="18" height="18" class="cursor-pointer" />
      </template>
    </el-popconfirm>

    </span>
  </div>
</template>
<script setup lang="ts">
import { toRefs } from 'vue'
import { MessageSendStatusEnum } from '@/enums/ws'
import { Icon } from '@iconify/vue'
import { IChatMessage } from '@/interface/ws'
import { EventName } from '@/event-server/event-name'
import { EventServer } from '@/event-server'

interface IProps {
  message: IChatMessage
}

const props = defineProps<IProps>()
const { message } = toRefs(props)
const eventServer = EventServer.getInstance()

function resendMessage() {
  eventServer.emit(EventName.RESEND_CHAT_MESSAGE, message.value)
}
</script>
<style scoped lang="scss">

</style>