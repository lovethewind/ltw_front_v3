<template>
  <div :class="['message-input-editor-container']">
    <div v-if="isMuted" class="message-input-mute">
      {{ muteText }}
    </div>
    <textarea
      v-if="!isMuted && enableInput"
      v-model="editorContent"
      :maxlength="10000"
      placeholder="按Enter发送，Ctrl+Enter换行"
      ref="editorDom"
      @keydown="handleKeydown"
      class="message-input-editor-area"
      style="resize: none"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'

const emits = defineEmits(['sendMessage'])

defineProps({
  replayOrReferenceMessage: {
    type: Object,
    default: () => ({})
  },
  isMuted: {
    type: Boolean,
    default: true
  },
  muteText: {
    type: String,
    default: ''
  },
  enableInput: {
    type: Boolean,
    default: true
  },
  enableAt: {
    type: Boolean,
    default: true
  },
  enableDragUpload: {
    type: Boolean,
    default: true
  },
  enableTyping: {
    type: Boolean,
    default: true
  }
})

const chatStore = useChatStore()
const editorDom = ref<HTMLElement>()
const currentConversation = computed(() => {
  return chatStore.currentConversation
})

const editorContent = computed({
  get() {
    return chatStore.editorContent
  },
  set(val) {
    chatStore.setEditorContent(val)
  }
})


watch(currentConversation, (val) => {
  if (val?.draftText) {
    setEditorContent(val.draftText)
  }
})

function getEditorContent() {
  return editorContent.value
}

function resetEditor() {
  editorContent.value = ''
}

function setEditorContent(content: string) {
  editorContent.value = content
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.ctrlKey) {
      insertWordAtCursor()
    } else {
      emits('sendMessage')
    }
  }
}

function insertWordAtCursor(word: string = '\n') {
  const element = editorDom.value
  const start = element.selectionStart
  const end = element.selectionEnd
  // 插入换行符
  editorContent.value = editorContent.value.substring(0, start) + word + editorContent.value.substring(end)
  // 移动光标到新位置
  setTimeout(() => {
    element.setSelectionRange(start + word.length, start + word.length)
    element.focus()
  }, 0)
}

defineExpose({
  getEditorContent,
  // addEmoji,
  resetEditor,
  setEditorContent,
  insertWordAtCursor
  // insertEditorContent,
  // blur,
})
</script>

<style scoped lang="scss">
@import "../../../assets/styles/common";

.message-input-editor {
  &-container {
    box-sizing: border-box;
    height: 100%;
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 3px 10px 10px;
  }

  &-area {
    box-sizing: border-box;
    height: 100%;
    flex: 1;
    display: flex;
    overflow-y: auto;
    border: none;
    outline: none;
  }

  &-mute {
    box-sizing: border-box;
    flex: 1;
    display: flex;
    color: #999;
    font-size: 14px;
    justify-content: center;
    align-items: center;
  }
}

.message-input-editor-container-h5 {
  box-sizing: border-box;
  flex: 1;
  height: auto;
  background: #f4f5f9;
  border-radius: 9.4px;
  padding: 8px 0 8px 10px;
  font-size: 16px !important;
  max-height: 86px;
  margin-right: 7px;
  overflow: hidden;

  .message-input-editor-area {
    overflow: auto;
    user-select: text;
    hyphens: auto;
    word-wrap: break-word;
    word-break: break-word;
    flex-wrap: wrap;

    .custom-image,
    .custom-image-emoji {
      display: inline;
    }
  }
}
</style>
<style lang="scss">
/* stylelint-disable-next-line selector-class-pattern */
.ProseMirror {
  min-height: 100%;
  height: fit-content;
  flex: 1;
  font-size: 14px;
  word-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
  user-select: text;

  div,
  ul,
  ol,
  dt,
  dd,
  li,
  dl,
  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
    padding: 0;
    font-style: normal;
  }

  p {
    & {
      vertical-align: bottom;
    }
  }

  &-focused {
    border: none;
    outline: none;
  }

  img {

    /* stylelint-disable-next-line selector-class-pattern */
    &.ProseMirror-selectednode {
      outline: 2px solid #68cef8;
    }
  }

  .custom-image {
    &-normal {
      max-height: 120px;
      max-width: 200px;
    }

    &-file {
      height: 50px;
      width: 160px;
      border: 1px solid #e8e8e9;
      border-radius: 5px;
    }

    &-emoji {
      height: 20px;
      width: 20px;
    }

    &-image {
      display: none;
    }
  }

  /* stylelint-disable-next-line selector-class-pattern */
  .ProseMirror-selectednode {
    outline: 2px solid #68cef8;
    cursor: none;
  }

  p,
  [contenteditable] {
    user-select: text;
  }

  // placeholder style
  p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
}
</style>
