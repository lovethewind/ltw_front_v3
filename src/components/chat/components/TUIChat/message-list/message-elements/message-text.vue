<template>
  <div :class="['message-text-container']">
    {{ content }}
  </div>
</template>

<script lang="ts" setup>
interface IProps {
  content: string
}

withDefaults(defineProps<IProps>(), {
  content: () => ('')
})

</script>
<style lang="scss" scoped>
.message-text-container {
  padding: 10px;
  text-align: left;
  white-space: pre-wrap;
  border-radius: 5px;
}


.is-other {
  .message-text-container {
    background-color: #e6e6e6;

    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-right: 5px solid #e6e6e6;
      left: -5px;
      top: 35px;
      transform: translateY(-50%);
    }
  }

}

.is-me {
  .message-text-container {
    background-color: #87dd87;

    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-left: 5px solid #87dd87;
      right: -5px;
      top: 35px;
      transform: translateY(-50%);
    }
  }
}

.text-select {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.emoji {
  vertical-align: bottom;
  width: 20px;
  height: 20px;
}

.text {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 14px;
  text-size-adjust: none;
}
</style>
