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
  position: relative;
  padding: 10px 12px;
  text-align: left;
  white-space: pre-wrap;
  border-radius: 8px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
  box-shadow: 0 8px 22px rgba(31, 41, 51, 0.08);
}


.is-other {
  .message-text-container {
    background-color: #fff;
    border-top-left-radius: 2px;

    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-right: 5px solid #fff;
      left: -5px;
      top: 14px;
      transform: translateY(-50%);
    }
  }

}

.is-me {
  .message-text-container {
    background-color: #37D18C;
    border-top-right-radius: 2px;
    color: #1f2933;

    &::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-left: 5px solid #37D18C;
      right: -5px;
      top: 14px;
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

html.dark {
  .is-other {
    .message-text-container {
      background-color: #2e2e2e;
      color: #e5e7eb;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);

      &::before {
        border-right-color: #2e2e2e;
      }
    }
  }

  .is-me {
    .message-text-container {
      color: #102018;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.2);
    }
  }
}
</style>
