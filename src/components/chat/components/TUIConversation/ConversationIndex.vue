<template>
  <div class="tui-conversation">
    <ConversationHeader v-if="isShowConversationHeader" ref="headerRef" />
    <ConversationNetwork />
    <ConversationList />
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue'
import ConversationList from './conversation-list/ConversationListIndex.vue'
import ConversationHeader from './conversation-header/ConversationHeaderIndex.vue'
import ConversationNetwork from './conversation-network/index.vue'

const headerRef = ref<typeof ConversationHeader>()
const isShowConversationHeader = ref<boolean>(true)
</script>

<style lang="scss" scoped src="./style/index.scss"></style>
