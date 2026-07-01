<template>
  <div class="message-input-toolbar">
    <div class="message-input-toolbar-list">
      <EmojiPicker ref="emojiPickerRef" @insertEmoji="insertEmoji" />
      <ImageUpload v-if="featureConfig.InputImage" />
      <FileUpload v-if="featureConfig.InputFile" />
      <VideoUpload v-if="featureConfig.InputVideo" />
    </div>
  </div>
</template>
<script setup lang="ts">
import EmojiPicker from './emoji-picker/index.vue'
import ImageUpload from './image-upload/index.vue'
import FileUpload from './file-upload/index.vue'
import VideoUpload from './video-upload/index.vue'
import TUIChatConfig from '../config'
import type { IEmojiChar } from '@/interface'


interface IEmits {
  (e: 'scrollToLatestMessage'): void;

  (e: 'insertEmoji', emoji: IEmojiChar): void;
}

const emits = defineEmits<IEmits>()
const featureConfig = TUIChatConfig.getFeatureConfig()

function insertEmoji(emojiObj: IEmojiChar) {
  emits('insertEmoji', emojiObj)
}
</script>
<style lang="scss" scoped>
@import "../../../assets/styles/common";
@import "@/assets/css/variables";

.message-input-toolbar {
  position: absolute;
  left: 12px;
  bottom: 2px;
  z-index: 2;
  width: auto;
  max-width: calc(100% - 130px);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 0;
  background: transparent;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;

  &-list {
    display: flex;
    flex-direction: row;
    align-items: center;

    .extension-list {
      list-style: none;
      display: flex;
      gap: 6px;

      &-item {
        width: 28px;
        height: 28px;
        padding: 4px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 160ms ease, transform 160ms ease;

        &:hover {
          background: #edf3f5;
          transform: translateY(-1px);
        }
      }
    }
  }
}

html.dark {
  .message-input-toolbar {
    border-top: none;

    .extension-list {
      &-item {
        &:hover {
          background: $dark-hover-color;
        }
      }
    }
  }
}
</style>
