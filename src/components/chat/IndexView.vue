<template>
  <el-dialog v-model="chatFlag" :show-close="false" class="chat-dialog" @close="handleClose">
    <div class="TUIKit">
      <div class="TUIKit-navbar">
        <div class="d-flex justify-content-center mt-2 mb-4">
          <el-avatar shape="square" :src="user.avatar" />
        </div>
        <div v-for="item of navbarList" :key="item.id"
             :class="['TUIKit-navbar-item', currentNavbar === item.id && 'TUIKit-navbar-item-active']"
             @click="() => {currentNavbar = item.id}"
        >
          <div>
            <Icon :icon="item.icon" />
          </div>
          <div>{{ item.label }}</div>
        </div>
      </div>
      <div class="TUIKit-main-container">
        <div v-if="currentNavbar === 'message'" class="TUIKit-main">
          <div class="TUIKit-main-aside">
            <TUIConversation />
          </div>
          <div class="TUIKit-main-main">
            <TUIChat>
              <h1>想聊点什么呢O(∩_∩)O</h1>
            </TUIChat>
          </div>
        </div>
        <div v-if="currentNavbar === 'contact'" class="TUIKit-main">
          <div class="TUIKit-main-main">
            <TUIContact displayType="contactList" @switchConversation="currentNavbar = 'message'" />
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useModalStore } from '@/stores/modal'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { TUIChat, TUIContact, TUIConversation } from '@/components/chat/components'
import { Icon } from '@iconify/vue'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { IConversation } from '@/interface/ws'

const modalStore = useModalStore()
const userStore = useUserStore()
const chatStore = useChatStore()

const eventServer = EventServer.getInstance()
const navbarList = [
  {
    id: 'message',
    icon: 'mdi:message',
    label: '消息'
  },
  {
    id: 'contact',
    icon: 'mdi:contacts',
    label: '通讯录'
  }
]

const chatFlag = computed({
  get: () => {
    return modalStore.chatFlag
  },
  set: (value) => {
    modalStore.setChatFlag(value)
  }
})
const user = computed(() => {
  return userStore.user
})
const currentNavbar = computed({
  get: () => {
    return chatStore.currentNavbar
  },
  set: (value) => {
    chatStore.setCurrentNavbar(value)
  }
})

onMounted(() => {
  eventServer.on(EventName.START_CONVERSATION_CHANGE_TO_CONTACT, startConversation)
})

onUnmounted(() => {
  eventServer.off(EventName.START_CONVERSATION_CHANGE_TO_CONTACT, startConversation)
})

function startConversation(conversation: IConversation) {
  currentNavbar.value = 'message'
  chatStore.setAddConversationUserId(conversation.contactId)
}

function handleClose() {
  chatStore.setAddConversationUserId(undefined)
}

</script>

<style scoped lang="scss">
@import "assets/styles/common";
@import "assets/styles/sample";
</style>
<style lang="scss">
.chat-dialog {
  width: 60%;
  margin: 2vh auto;
  overflow: hidden;
  padding: 0;

  .el-dialog__header {
    padding: 0;
  }
}
</style>