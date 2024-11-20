<template>
  <div :ref="convHeaderRef" class="tui-conversation-header">
    <ul v-if="menuList.length > 0" class="list">
      <li v-for="(item, index) in menuList" :key="index" class="list-item">
        <main class="tui-conversation-header-item" @click.stop="handleMenu(item)">
          <Icon class="tui-conversation-header-item-icon" :icon="item.icon" />
          <h1 class="tui-conversation-header-item-title">
            {{ item.text }}
          </h1>
        </main>
      </li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { toWait } from '@/utils/common'

interface IMenuItem {
  /** 唯一标示 */
  name: string;
  /** svg 图标 HTML */
  icon?: string;

  /** 自定义按钮点击时触发的事件 */
  click?(event: Event): void;
}

const convHeaderRef = ref<HTMLElement | undefined>()

const menuList = computed(() => {
  return [{
    text: '发起群聊',
    icon: 'mdi:plus',
    click: toWait
  }]
})

onMounted(() => {
})

function handleMenu(item: IMenuItem) {
  item.click()
}

</script>

<style lang="scss" scoped src="../style/index.scss"></style>
