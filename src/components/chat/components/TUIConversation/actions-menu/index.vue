<template>
  <div
    id="conversation-actions-menu"
    v-click-outside="closeConversationActionMenu"
    ref="actionsMenuDomRef"
    class="actions-menu"
    :style="{
        top: `${actionsMenuPosition.top}px`,
        left: `${actionsMenuPosition.left}px`,
      }"
  >
    <div
      class="actions-menu-item"
      @click="deleteConversation()"
    >删除会话
    </div>
    <div
      v-if="!selectedConversation?.isPinned"
      class="actions-menu-item"
      @click="pinConversation(true)"
    >
      置顶会话
    </div>
    <div
      v-if="selectedConversation?.isPinned"
      class="actions-menu-item"
      @click="pinConversation(false)"
    >
      取消置顶
    </div>
    <div
      v-if="!(selectedConversation && selectedConversation.isMuted)"
      class="actions-menu-item"
      @click="muteConversation(true)"
    >
      消息免打扰
    </div>
    <div
      v-if="selectedConversation?.isMuted"
      class="actions-menu-item"
      @click="muteConversation(false)"
    >取消免打扰
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, toRefs } from 'vue'
import { IConversation } from '@/interface/ws'
import { ContactTypeEnum } from '@/enums/ws'
import chatApi from '@/api/chat'
import { ElMessageBox } from 'element-plus'

interface IProps {
  actionsMenuPosition: {
    top: number
    left?: number
    conversationHeight?: number
  }
  selectedConversation: IConversation | undefined
}

const emits = defineEmits(['closeConversationActionMenu', 'clearConversation', 'sortConversation'])
const props = defineProps<IProps>()

const { actionsMenuPosition, selectedConversation } = toRefs(props)
const actionsMenuDomRef = ref<HTMLElement | null>()

onMounted(() => {
})

function deleteConversation() {
  const text = selectedConversation.value?.contactType === ContactTypeEnum.USER
    ? '删除后，将清空该聊天的消息记录'
    : selectedConversation.value?.contactType === ContactTypeEnum.GROUP ? '删除后，将清空该群聊的消息记录' : ''
  ElMessageBox.confirm(text, '提示').then(() => {
    chatApi.updateConversation({
      conversationId: selectedConversation.value?.conversationId,
      isClear: true
    }).then(() => {
      emits('clearConversation', selectedConversation)
    })
  })
}

function pinConversation(isPinned: boolean) {
  chatApi.updateConversation({
    conversationId: selectedConversation.value?.conversationId,
    isPinned: isPinned
  }).then(() => {
    selectedConversation.value!.isPinned = isPinned
    emits('sortConversation')
  })
}

function muteConversation(isMuted: boolean) {
  chatApi.updateConversation({
    conversationId: selectedConversation.value?.conversationId,
    isMuted: isMuted
  }).then(() => {
    selectedConversation.value!.isMuted = isMuted
  })
}

function closeConversationActionMenu() {
  emits('closeConversationActionMenu')
}
</script>

<style scoped lang="scss">
@import "@/assets/css/variables";

.actions-menu {
  position: absolute;
  left: 0;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 -4px 12px 0 rgba(0, 0, 0, 0.06);
  background-color: #fff;
  overflow: hidden;
  opacity: 1;
  z-index: 1;

  .actions-menu-item {
    cursor: pointer;
    padding: 10px 20px;
    font-size: 12px;
    word-break: keep-all;

    &:hover {
      background-color: #eee;
    }
  }

}

html.dark {
  .actions-menu {
    background-color: $dark-main-color;
    border: 1px solid $dark-border-color;

    .actions-menu-item {
      &:hover {
        background-color: $dark-hover-color;
      }
    }
  }
}
</style>
