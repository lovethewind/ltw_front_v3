<template>
  <div class="rightside">
    <el-tooltip :content="themeTooltip" placement="left" effect="light">
      <div class="setting-container" @click="changeTheme">
        <Icon v-if="themeMode === 'system'" icon="ph:monitor" class="system-theme" />
        <Icon v-else-if="themeMode === 'dark'" icon="bitcoin-icons:moon-outline" class="night" />
        <Icon v-else icon="ph:sun" class="sunny" />
      </div>
    </el-tooltip>
    <el-tooltip content="私信聊天" placement="left" effect="light">
      <div class="setting-container" @click="openChat">
        <Icon icon="token:chat" color="green" />
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
import { Icon } from '@iconify/vue'
import { checkIsLogin } from '@/utils/common'
import { EventServer } from '@/event-server'
import { EventName } from '@/event-server/event-name'
import type { ThemeMode } from '@/stores/common'

const commonStore = useCommonStore()
const modalStore = useModalStore()
const chatStore = useChatStore()
const eventServer = EventServer.getInstance()

const isShow = ref('display: none')
const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
const systemPrefersDark = ref(systemThemeMedia.matches)
const themeModeList: ThemeMode[] = ['light', 'dark', 'system']

const themeMode = computed<ThemeMode>(() => commonStore.theme)

const isDark = computed(() => {
  return themeMode.value === 'dark' || (themeMode.value === 'system' && systemPrefersDark.value)
})

const themeTooltip = computed(() => {
  const themeNameMap: Record<ThemeMode, string> = {
    light: '日间模式',
    dark: '夜间模式',
    system: '跟随系统'
  }
  return `当前：${themeNameMap[themeMode.value]}，点击切换`
})

watch(isDark, (newValue: boolean, oldValue: boolean) => {
  if (newValue !== oldValue) {
    moveOrAddHtmlClass()
  }
})

onMounted(() => {
  eventServer.on(EventName.START_CHAT_WITH_USER, openChatWindow)
  systemThemeMedia.addEventListener('change', handleSystemThemeChange)
  moveOrAddHtmlClass()
  window.addEventListener('scroll', scrollToTop)
})

onUnmounted(() => {
  systemThemeMedia.removeEventListener('change', handleSystemThemeChange)
  window.removeEventListener('scroll', scrollToTop)
})

/**
 * 按日间、夜间、跟随系统的顺序切换主题模式。
 *
 * :return: 无返回值。
 */
function changeTheme(): void {
  const currentIndex = themeModeList.indexOf(themeMode.value)
  commonStore.setTheme(themeModeList[(currentIndex + 1) % themeModeList.length])
}

/**
 * 根据当前生效主题更新根元素主题类名。
 *
 * :return: 无返回值。
 */
function moveOrAddHtmlClass(): void {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }
}

/**
 * 响应系统颜色模式变化。
 *
 * :param event: 系统颜色模式媒体查询事件。
 * :return: 无返回值。
 */
function handleSystemThemeChange(event: MediaQueryListEvent): void {
  systemPrefersDark.value = event.matches
}

function openFeedback() {
  modalStore.setFeedbackFlag(true)
}

function openChat() {
  if (!checkIsLogin()) return
  chatStore.setAddConversationUserId('')
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
    behavior: 'auto',
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
  --rightside-offset: 20px;

  z-index: 10;
  position: fixed;
  right: var(--rightside-offset);
  bottom: 20px;
  top: auto;
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
  background-color: $a-hover-color;
}

.setting-container:hover svg {
  color: #fff !important;
}

.sunny {
  color: #f6b810 !important;
}

.night {
  color: #3b4bda !important;;
}

.system-theme {
  color: #0f9f8f !important;
}

.feedback {
  color: #9d693f !important;
}

.to-top {
  color: rgba(115, 65, 201, 0.99) !important;;
}

@media screen and (max-width: 759px) {
  .rightside {
    --rightside-offset: 10px;

    bottom: 12px;
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
