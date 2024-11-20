<template>
  <div :class="['message-input-button']">
    <el-button
      type="primary"
      v-if="props.enableSend"
      :disabled="false"
      @click="sendMessage"
    >
      <template #icon>
        <Icon icon="tabler:send" />
      </template>
      发送
    </el-button>
  </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = defineProps({
  enableSend: {
    type: Boolean,
    default: true
  }
})

const emits = defineEmits(['sendMessage'])

const sendMessage = () => {
  emits('sendMessage')
}
</script>
<style scoped lang="scss">
@import "../../../assets/styles/common";

.message-input-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  text-align: right;

  &-h5 {
    position: static;
  }

  &-cont {
    padding: 8px 20px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    text-align: center;
    line-height: 20px;
    font-weight: 400;
    background: #006eff;
    color: #fff;
    letter-spacing: 0;
    cursor: pointer;
  }

  &-hover {
    display: none;
    justify-content: center;
    align-items: center;
    position: absolute;
    right: 120%;
    word-break: keep-all;
    height: 30px;
    white-space: nowrap;
    top: 0;
    bottom: 0;
    margin: auto 0;
    padding: 5px 10px;
    border-radius: 3px;
    background: #000;
    color: #fff;
    opacity: 0.3;

    &::before {
      content: "";
      position: absolute;
      width: 0;
      height: 0;
      right: -20px;
      border: 10px solid transparent;
      border-left: 10px solid #000;
    }
  }

  &:hover {
    .message-input-button-hover {
      display: flex;
    }
  }
}
</style>
