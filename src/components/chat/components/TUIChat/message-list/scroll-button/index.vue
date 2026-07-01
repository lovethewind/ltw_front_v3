<template>
  <div
    v-if="isScrollButtonVisible"
    class="scroll-button"
    @click="scrollToMessageListBottom"
  >
    <Icon
      class="scroll-button-icon"
      width="16px"
      height="16px"
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


/**
 * 判断消息列表是否已向上滚动超过一屏。
 *
 * :param e: 滚动事件对象。
 * :return: 无返回值。
 */
async function judgeScrollOverOneScreen(e: Event): Promise<void> {
  if (e.target) {
    try {
      const { height } = getBoundingClientRect(`${(e.target as HTMLElement)?.id}` || 'messageList') || {}
      const detail = (e as any).detail as HTMLElement | undefined
      const scrollHeight = (e.target as HTMLElement)?.scrollHeight || detail?.scrollHeight || 0
      const scrollTop = (e.target as HTMLElement)?.scrollTop || detail?.scrollTop || 0
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

/**
 * 滚动到消息列表底部。
 *
 * :return: 无返回值。
 */
function scrollToMessageListBottom(): void {
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
  bottom: 18px;
  right: 22px;
  min-width: 108px;
  height: 36px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(47, 143, 131, 0.18);
  box-shadow: 0 14px 32px rgba(31, 41, 51, 0.14);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  color: #2f8f83;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  backdrop-filter: blur(10px);
  transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

  &:hover {
    background: #fff;
    box-shadow: 0 18px 36px rgba(31, 41, 51, 0.18);
    transform: translateY(-1px);
  }

  &-icon {
    flex: 0 0 auto;
  }

  &-text {
    font-family: PingFangSC-Regular, system-ui;
    font-size: 12px;
    font-weight: 600;
    color: currentColor;
    margin-left: 5px;
  }
}

html.dark {
  .scroll-button {
    background: rgba(35, 36, 37, 0.94);
    border: 1px solid $dark-border-color;
    color: #37D18C;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.34);

    &:hover {
      background: #2e2e2e;
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.4);
    }
  }
}
</style>
