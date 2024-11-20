<template>
  <ToolbarItemContainer
    ref="container"
    icon="mdi:emoji-outline"
    title="表情"
  >
    <emoji-view @add-emoji="insertEmoji" />
  </ToolbarItemContainer>
</template>
<script lang="ts" setup>
import { computed, ref } from 'vue'
import ToolbarItemContainer from '../toolbar-item-container/index.vue'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import EmojiView from '@/components/base/EmojiView.vue'
import { IEmojiChar, IEmojiCollect } from '@/interface'

interface IEmits {
  (e: 'sendMessage'): void;

  (e: 'toggleComponent'): void;

  (e: 'insertEmoji', emoji: any): void;

  (e: 'dialogShowInH5', dialogRef: HTMLElement): void;

  (e: 'dialogCloseInH5', dialogRef: HTMLElement): void;

  (e: 'changeToolbarDisplayType', type: ToolbarDisplayType): void;
}

const emits = defineEmits<IEmits>()
const userStore = useUserStore()
const chatStore = useChatStore()
const container = ref<InstanceType<typeof ToolbarItemContainer>>()

const currentConversation = computed(() => {
  return chatStore.currentConversation
})

function insertEmoji(emojiObj: IEmojiChar & IEmojiCollect) {
  if (emojiObj.char) {
    emits('insertEmoji', emojiObj)
    return
  }
  sendMessage(emojiObj)
}

function sendMessage(emojiObj: IEmojiCollect) {
  emits('sendMessage')
  currentConversation.value
  userStore.user
}
</script>
<style lang="scss" scoped src="./style/index.scss"></style>
