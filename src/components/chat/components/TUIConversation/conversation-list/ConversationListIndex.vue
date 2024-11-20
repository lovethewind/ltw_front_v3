<template>
  <div ref="conversationListInnerDomRef" class="tui-conversation-list">
    <ActionsMenu
      v-if="isShowOverlay"
      :selectedConversation="selectConversation"
      :actionsMenuPosition="actionsMenuPosition"
      @closeConversationActionMenu="closeConversationActionMenu"
      @clearConversation="clearConversation"
      @sortConversation="sortConversationList"
    />
    <div
      v-for="(conversation, index) in conversationList"
      :id="`conversation-item-${index}`"
      :key="index"
      class="tui-conversation-content"
      @contextmenu="showConversationActionMenu($event, conversation, index, true)"
    >
      <div :class="['tui-conversation-item', {
        'tui-conversation-item-selected': currentConversation?.conversationId === conversation.conversationId,
      }]"
           @click="enterConversationChat(conversation)">
        <aside class="left">
          <el-avatar shape="square" :src="conversation.userProfile?.avatar || conversation.groupProfile?.avatar" />
          <div :class="['online-status', conversation.online ? 'online-status-online' : 'online-status-offline']"
          />
          <span v-if="conversation.unreadCount > 0 && !conversation.isMuted" class="num">
            {{ conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }}
          </span>
          <span v-if="conversation.unreadCount > 0 && conversation.isMuted" class="num-notify" />
        </aside>
        <div class="content">
          <div class="content-header">
            <label class="content-header-label">
              <span class="name">{{ conversation.userProfile?.nickname || conversation.groupProfile?.name }}</span>
            </label>
            <div class="middle-box">
              <span v-if="conversation.draftText"
                    class="middle-box-draft ellipsis">[草稿]{{ conversation.draftText }}</span>
              <span
                v-else-if="
                  conversation.type === 'GROUP' &&
                    conversation.groupAtInfoList &&
                    conversation.groupAtInfoList.length > 0
                "
                class="middle-box-at"
              >{{ conversation.getGroupAtInfo() }}</span>
              <div v-else class="middle-box-content">
                {{ dealChatMessageContent(conversation.lastMessage) }}
              </div>
            </div>
          </div>
          <div class="content-footer">
            <span class="time">{{ formatDateToMinute(conversation.lastMessage?.createTime) }}</span>
            <div>
              <Icon v-if="conversation.isPinned" icon="lucide:pin" />
              <Icon v-if="conversation.isMuted" icon="ep:mute-notification" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { IChatMessage, IConversation } from '@/interface/ws'
import { computed, onMounted, onUnmounted, Ref, ref, watch } from 'vue'
import ActionsMenu from '../actions-menu/index.vue'
import { Icon } from '@iconify/vue'
import { useChatStore } from '@/stores/chat'
import chatApi from '@/api/chat'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import { formatDateToMinute } from '@/utils/date'
import { dealChatMessageContent } from '@/components/ws/util'
import { ContactTypeEnum } from '@/enums/ws'
import { useUserStore } from '@/stores/user'

const chatStore = useChatStore()
const userStore = useUserStore()
const eventServer = EventServer.getInstance()

const selectConversation = ref<IConversation>()
const isShowOverlay = ref<boolean>(false)
const conversationList = ref<IConversation[]>([])
const conversationListInnerDomRef = ref<HTMLElement | undefined>()
const actionsMenuPosition = ref<{
  top: number;
  left: number | undefined;
  conversationHeight: number | undefined;
}>({
  top: 0,
  left: undefined,
  conversationHeight: undefined
})
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const addConversationUserId = computed(() => {
  return chatStore.addConversationUserId
})
const currentConversation = computed(() => {
  return chatStore.currentConversation
})
const user = computed(() => {
  return userStore.user
})

watch(addConversationUserId, (val: string) => {
  val && addConversationUser(val)
})

onMounted(() => {
  eventServer.on(EventName.RECEIVE_CHAT_MESSAGE, receiveMessage)
  getConversationList()
})

onUnmounted(() => {
  eventServer.off(EventName.RECEIVE_CHAT_MESSAGE, receiveMessage)
})

function closeConversationActionMenu() {
  // Prevent continuous triggering of overlay tap events
  selectConversation.value = undefined
  isShowOverlay.value = false
}

function enterConversationChat(conversation: IConversation) {
  if (conversation.unreadCount > 0) {
    chatApi.updateConversation({
      conversationId: conversation.conversationId,
      allRead: true
    }).then(() => {
      conversation.unreadCount = 0
    })
  }
  if (currentConversation.value?.conversationId === conversation.conversationId) return
  isShowOverlay.value = false
  chatStore.setCurrentConversationDraftText(chatStore.editorContent)
  chatStore.setEditorContent('')
  chatStore.setCurrentConversation(conversation)
  eventServer.emit(EventName.CHANGE_CURRENT_CONVERSATION, conversation)
}

function getConversationList() {
  chatApi.getConversationPageList(currentPage.value, pageSize.value).then(res => {
    conversationList.value = [...conversationList.value, ...res.data.records]
    total.value = res.data.total
    if (res.data.records.length) {
      currentPage.value++
    }
    if (addConversationUserId.value) {
      addConversationUser(addConversationUserId.value)
    }
  })
}

function receiveMessage(message: IChatMessage) {
  const conversation = conversationList.value.find(item => item.conversationId === message.conversationId)
  if (conversation) {
    conversation.lastMessage = message
    if (currentConversation.value?.conversationId !== message.conversationId) {
      conversation.unreadCount++
    }
    sortConversationList()
    return
  }
  const contactId = message.userId === user.value.id ? message.contactId : message.userId
  chatApi.getConversationDetail({
    contactId: contactId,
    contactType: message.contactType
  }).then(res => {
    conversationList.value.push(res.data)
    sortConversationList()
  })
}

function addConversationUser(userId: string) {
  chatApi.getConversationDetail({
    contactId: userId,
    contactType: ContactTypeEnum.USER
  }).then(res => {
    const conversation = res.data
    chatStore.setAddConversationUserId(undefined)
    const existConversation = conversationList.value.find(item => item.conversationId === conversation.conversationId)
    if (existConversation) {
      enterConversationChat(existConversation)
      return
    }
    conversationList.value.unshift(conversation)
    sortConversationList()
    enterConversationChat(conversation)
  })
}

function sortConversationList() {
  conversationList.value.sort((a, b) => {
    // 先按置顶排序
    if (a.isPinned !== b.isPinned) {
      return b.isPinned - a.isPinned
    }
    return b.lastMessage?.createTime?.localeCompare(a.lastMessage?.createTime) || 0
  })
}

function showConversationActionMenu(event: MouseEvent, conversation: IConversation, index: number, isContextMenuEvent?: boolean) {
  isShowOverlay.value = false
  if (isContextMenuEvent) {
    event.preventDefault()
  }
  selectConversation.value = conversation
  getActionsMenuPosition(event, index)
  isShowOverlay.value = true
}


function getActionsMenuPosition(event: MouseEvent) {
  const rect = ((event.currentTarget || event.target) as HTMLElement)?.getBoundingClientRect() || {}
  if (rect) {
    actionsMenuPosition.value = {
      top: rect.bottom - 30,
      left: rect.left - 220,
      conversationHeight: rect.height
    }
  }
}

function clearConversation(conversation: Ref<IConversation>) {
  conversationList.value.splice(conversationList.value.indexOf(conversation.value), 1)
  isShowOverlay.value = false
  chatStore.setCurrentConversation(undefined)
  chatStore.setCurrentConversation(undefined)
}

// Expose to the parent component and close actionsMenu when a sliding event is detected
defineExpose(
  {
    closeChildren: closeConversationActionMenu
  }
)
</script>

<style lang="scss" scoped src="./style/index.scss"></style>
<style lang="scss" scoped>
.disable-select {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
