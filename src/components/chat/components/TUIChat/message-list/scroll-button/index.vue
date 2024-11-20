<template>
  <div
    v-if="isScrollButtonVisible"
    class="scroll-button"
    @click="scrollToMessageListBottom"
  >
    <Icon
      width="10px"
      height="10px"
      color="#98bdd0"
      icon="mdi:arrow-down"
    />
    <div class="scroll-button-text">
      {{ scrollButtonContent }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { getBoundingClientRect } from '@/components/chat/utils'

interface IEmits {
  (key: 'scrollToLatestMessage'): void;
}

const emits = defineEmits<IEmits>()

const isScrollButtonVisible = ref<boolean>(false)
const newMessageCount = ref(0)
const scrollButtonContent = computed(() =>
  newMessageCount.value ? `${newMessageCount.value}条新消息` : '回到底部'
)


// When the scroll height of the message list upwards is greater than one screen, show scrolling to the latest tips.
async function judgeScrollOverOneScreen(e: Event) {
  if (e.target) {
    try {
      const { height } = getBoundingClientRect(`${(e.target as HTMLElement)?.id}` || 'messageList') || {}
      const scrollHeight = (e.target as HTMLElement)?.scrollHeight || (e.detail as HTMLElement)?.scrollHeight
      const scrollTop = (e.target as HTMLElement)?.scrollTop || (e.detail as HTMLElement)?.scrollTop || 0
      // while scroll over one screen show this scroll button.
      if (scrollHeight - scrollTop > 2 * height) {
        isScrollButtonVisible.value = true
        return
      }
      isScrollButtonVisible.value = false
    } catch (error) {
      isScrollButtonVisible.value = false
    }
  }
}

function scrollToMessageListBottom() {
  emits('scrollToLatestMessage')
}

defineExpose({
  judgeScrollOverOneScreen,
  isScrollButtonVisible
})
</script>

<style scoped lang="scss">
@import "@/assets/css/variables";

.scroll-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 92px;
  height: 28px;
  background: #fff;
  border: 1px solid #e0e0e0;
  box-shadow: 0 4px 12px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &-text {
    font-family: PingFangSC-Regular, system-ui;
    font-size: 10px;
    color: #98bdd0;
    margin-left: 3px;
  }
}

html.dark {
  .scroll-button {
    background: $dark-main-color;
    border: 1px solid $dark-border-color;
  }
}
</style>
