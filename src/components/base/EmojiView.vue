<template>
  <div class="emoji-picker">
    <ul ref="emojiPickerListRef" class="emoji-picker-list">
      <li
        v-for="(childrenItem, childrenIndex) in currentEmojiList"
        :key="childrenIndex"
        class="emoji-picker-list-item"
      >
        <div v-if="currentTabItem === EmojiTab.BASIC"
             @click="addEmoji(childrenItem)"
             :title="childrenItem.name"
             class="emoji">{{ childrenItem.char }}
        </div>
        <img
          v-else-if="currentTabItem === EmojiTab.COLLECT"
          class="emoji-big"
          :src="childrenItem.char"
          @click="addEmoji(childrenItem)"
          alt="">
      </li>
      <li v-if="currentEmojiList.length === 0" class="no-data-li">
        <div class="no-data">表情包收藏功能开发中，敬请期待</div>
      </li>
    </ul>
    <ul class="emoji-picker-tab">
      <li
        v-for="(item, index) in tabList"
        :key="index"
        class="emoji-picker-tab-item"
        @click="toggleEmojiTab(item.type)"
      >
        <Icon :icon="item.icon"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EmojiList } from '@/utils/emoji'
import { Icon } from '@iconify/vue'
import { IEmojiChar, IEmojiCollect } from '@/interface'

const emit = defineEmits(['addEmoji'])

enum EmojiTab {
  BASIC = 1,
  COLLECT = 2
}

const currentEmojiList = ref(EmojiList)
const currentTabItem = ref(EmojiTab.BASIC)
const tabList = ref([{
  type: EmojiTab.BASIC,
  icon: 'mdi:emoji-outline'
}, {
  type: EmojiTab.COLLECT,
  icon: 'mdi:heart-outline'
}])

function toggleEmojiTab(tab: EmojiTab) {
  currentTabItem.value = tab
  if (tab === EmojiTab.COLLECT) {
    currentEmojiList.value = []
  } else {
    currentEmojiList.value = EmojiList
  }
}

function addEmoji(val: IEmojiChar & IEmojiCollect) {
  emit('addEmoji', val)
}
</script>

<style lang="scss" scoped>
.emoji-picker {
  width: 405px;
  height: 300px;
  display: flex;
  flex-direction: column;

  &-list {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    overflow-y: auto;
    margin: 2px;

    .no-data-li {
      flex: 1;

      .no-data {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    &::-webkit-scrollbar {
      display: none;
    }

    &-item {
      cursor: pointer;
      padding: 5px;

      .emoji {
        width: 30px;
        height: 30px;
        font-size: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #ccc;
          border-radius: 5px;
        }
      }

      .emoji-big {
        width: 70px;
        height: 70px;
      }
    }
  }

  &-tab {
    display: flex;
    align-items: center;
    margin: 0;

    &-item {
      padding: 0 10px;
      cursor: pointer;

      svg {
        margin: 10px;
        width: 20px;
        height: 20px;

        &-big {
          margin: 2px 0;
          width: 30px;
          height: 30px;
        }
      }
    }
  }
}

</style>
