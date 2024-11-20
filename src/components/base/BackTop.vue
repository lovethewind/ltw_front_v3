<template>
  <div class="rightside">
    <el-tooltip :content="'打开' + (isDark ? '白天' : '夜间') + '模式'" placement="left" effect="light">
      <div class="setting-container" @click="changeTheme">
        <Icon icon="bitcoin-icons:moon-outline" v-if="isDark" class="night" />
        <Icon icon="ph:sun" v-else class="sunny" />
      </div>
    </el-tooltip>
    <el-tooltip content="私信聊天" placement="left" effect="light">
      <div class="setting-container" @click="openChat">
        <Icon icon="token:chat" color="green" />
      </div>
    </el-tooltip>
    <el-tooltip :content="(showSpecialFlag ? '关闭' : '开启') + '特效'" placement="left" effect="light">
      <div class="setting-container" @click="opSpecialEffects">
        <Icon icon="mingcute:maple-leaf-line" :style="{color: showSpecialFlag ? 'pink' : '#909399'}" />
      </div>
    </el-tooltip>
    <el-tooltip content="意见反馈" placement="left" effect="light">
      <div class="setting-container" @click="openFeedback">
        <Icon icon="material-symbols:feedback-outline" class="feedback" />
      </div>
    </el-tooltip>
    <el-tooltip content="返回顶部" placement="left" effect="light">
      <div :style="isShow" class="setting-container" @click="backTop">
        <Icon icon="fluent-emoji-high-contrast:top-arrow" class="to-top" />
      </div>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useCommonStore } from '@/stores/common'
import { useModalStore } from '@/stores/modal'
import { useChatStore } from '@/stores/chat'
import { stopOrStart } from '@/utils/sakura'
import { Icon } from '@iconify/vue'
import { checkIsLogin } from '@/utils/common'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'

const commonStore = useCommonStore()
const modalStore = useModalStore()
const chatStore = useChatStore()
const eventServer = EventServer.getInstance()

const showSpecialFlag = ref(false)
const isShow = ref('display: none')

const isDark = computed(() => {
  return commonStore.theme === 'dark'
})

watch(isDark, (newValue: boolean, oldValue: boolean) => {
  if (newValue !== oldValue) {
    moveOrAddHtmlClass()
  }
})

onMounted(() => {
  eventServer.on(EventName.START_CHAT_WITH_USER, openChatWindow)
  moveOrAddHtmlClass()
  showSpecialFlag.value = commonStore.websiteInfo.showSpecial
  setTimeout(() => {
    stopOrStart(showSpecialFlag.value)
  }, 1000)
  window.addEventListener('scroll', scrollToTop)
})

onUnmounted(() => {
  window.removeEventListener('scroll', scrollToTop)
})

function changeTheme() {
  commonStore.setTheme(isDark.value ? 'light' : 'dark')
}

function moveOrAddHtmlClass() {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }
}

function openFeedback() {
  modalStore.setFeedbackFlag(true)
}

function opSpecialEffects() {
  showSpecialFlag.value = !showSpecialFlag.value
  commonStore.setShowSpecial(showSpecialFlag.value)
  stopOrStart(showSpecialFlag.value)
}

function openChat() {
  if (!checkIsLogin()) return
  chatStore.setAddConversationUserId(undefined)
  modalStore.setChatFlag(true)
}

function openChatWindow(userId: string) {
  if (!checkIsLogin()) return
  chatStore.setAddConversationUserId(userId)
  chatStore.setCurrentNavbar('message')
  modalStore.setChatFlag(true)
}

// 回到顶部方法
function backTop() {
  window.scrollTo({
    behavior: 'smooth',
    top: 0
  })
}

// 为了计算距离顶部的高度，当高度大于20显示回顶部图标，小于100则隐藏
function scrollToTop() {
  const scrollTop =
    document.documentElement.scrollTop ||
    document.body.scrollTop
  if (scrollTop > 20) {
    isShow.value = 'opacity: 1;'
  } else {
    isShow.value = 'display: none'
  }
}

</script>

<style lang="scss" scoped>
@import "@/assets/css/variables";

.rightside {
  z-index: 4;
  position: fixed;
  right: 38px;
  top: 70%;
  transition: all 0.5s;
}

.setting-container {
  display: flex;
  margin-bottom: 10px;
  width: 40px;
  height: 40px;
  text-align: center;
  font-size: 20px;
  line-height: 40px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
  box-shadow: var(--el-box-shadow-lighter)
}

.setting-container span {
  display: flex;
}

.setting-container:hover {
  background-color: #ff7242;
}

.setting-container:hover span {
  color: white !important;
}

.rotate-container span {
  display: flex;
  animation: turn-around 2s linear infinite;
}

.sunny {
  color: #f6b810 !important;
}

.night {
  color: #3b4bda !important;;
}

.feedback {
  color: #9d693f !important;
}

.to-top {
  color: rgba(115, 65, 201, 0.99) !important;;
}

@media screen and (max-width: 759px) {
  .rightside {
    right: 10px;
  }
}

@keyframes turn-around {
  0% {
    transform: rotate(0);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes rightsideOut {
  0% {
    display: flex;
  }
  100% {
    display: none;
  }
}

html.dark {
  .setting-container {
    background: $dark-main-color;

    &:hover {
      background-color: $dark-hover-color;
    }
  }
}
</style>
