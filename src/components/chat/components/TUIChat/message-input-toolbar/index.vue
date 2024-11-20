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
import { IEmojiChar } from '@/interface'


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
  border-top: 1px solid #f4f5f9;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
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

      &-item {
        width: 20px;
        height: 20px;
        padding: 12px 10px 1px;
        cursor: pointer;
      }
    }
  }
}

html.dark {
  .message-input-toolbar {
    border-top: 1px solid $dark-border-color;
  }
}
</style>
