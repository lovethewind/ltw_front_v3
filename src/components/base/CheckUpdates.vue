<template>
  <el-dialog
    v-model="dialogVisible"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    title="新版本可用"
    width="min(520px, calc(100vw - 32px))"
  >
    <p class="version-update-description">点击刷新以获取最新版本</p>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">刷新</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { getVersionTagFromHeaders, isVersionChanged } from '@/utils/version-update'

interface CheckUpdatesProps {
  /** 检查更新的地址。 */
  checkUpdateUrl?: string
  /** 轮询时间，单位为分钟。 */
  checkUpdatesInterval?: number
}

const props = withDefaults(defineProps<CheckUpdatesProps>(), {
  checkUpdateUrl: import.meta.env.BASE_URL || '/',
  checkUpdatesInterval: 1
})

const dialogVisible = ref(false)
let isCheckingUpdates = false
let lastVersionTag = ''
let timer: ReturnType<typeof setInterval> | undefined

/**
 * 刷新页面以加载最新版本。
 *
 * :return: 无返回值。
 */
function handleConfirm(): void {
  window.location.reload()
}

/**
 * 请求检测地址并读取当前版本标识。
 *
 * :return: 当前版本标识；本地环境、请求失败或响应头缺失时返回 null。
 */
async function requestVersionTag(): Promise<string | null> {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return null
  }

  try {
    const response = await fetch(props.checkUpdateUrl, {
      cache: 'no-cache',
      method: 'HEAD',
      redirect: 'manual'
    })
    return getVersionTagFromHeaders(response.headers)
  } catch (error) {
    console.error('获取前端版本标识失败', error)
    return null
  }
}

/**
 * 检查线上版本并在版本变化时显示刷新提示。
 *
 * :return: 无返回值。
 */
async function checkForUpdates(): Promise<void> {
  const currentVersionTag = await requestVersionTag()
  if (!currentVersionTag) {
    return
  }

  if (!lastVersionTag) {
    lastVersionTag = currentVersionTag
    return
  }

  if (isVersionChanged(lastVersionTag, currentVersionTag)) {
    stopCheckingUpdates()
    dialogVisible.value = true
  }
}

/**
 * 启动定时版本检测。
 *
 * :return: 无返回值。
 */
function startCheckingUpdates(): void {
  if (props.checkUpdatesInterval <= 0 || dialogVisible.value) {
    return
  }

  stopCheckingUpdates()
  timer = setInterval(checkForUpdates, props.checkUpdatesInterval * 60 * 1000)
}

/**
 * 停止定时版本检测。
 *
 * :return: 无返回值。
 */
function stopCheckingUpdates(): void {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

/**
 * 根据页面可见性暂停或恢复版本检测。
 *
 * :return: 无返回值。
 */
async function handleVisibilityChange(): Promise<void> {
  if (document.hidden) {
    stopCheckingUpdates()
    return
  }

  if (isCheckingUpdates || dialogVisible.value) {
    return
  }

  isCheckingUpdates = true
  try {
    await checkForUpdates()
  } finally {
    isCheckingUpdates = false
    startCheckingUpdates()
  }
}

/**
 * 初始化版本检测和页面可见性监听。
 *
 * :return: 无返回值。
 */
function handleMounted(): void {
  startCheckingUpdates()
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

/**
 * 清理版本检测定时器和页面可见性监听。
 *
 * :return: 无返回值。
 */
function handleBeforeUnmount(): void {
  stopCheckingUpdates()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
}

onMounted(handleMounted)
onBeforeUnmount(handleBeforeUnmount)
</script>

<style scoped>
.version-update-description {
  margin: 8px 0;
  font-size: 16px;
}
</style>
