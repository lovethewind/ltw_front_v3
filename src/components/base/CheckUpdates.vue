<template>
  <el-dialog
    v-model="dialogVisible"
    class="version-update-dialog"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="min(520px, calc(100vw - 32px))"
  >
    <template #header>
      <div class="version-update-header">
        <div class="version-update-icon" aria-hidden="true">
          <Icon icon="solar:refresh-circle-bold-duotone" />
        </div>
        <div class="version-update-heading">
          <span>版本更新</span>
          <h2>发现新版本</h2>
        </div>
      </div>
    </template>
    <div class="version-update-content">
      <p class="version-update-description">页面已有新内容，刷新后即可继续使用最新版本。</p>
      <div class="version-update-tip">
        <Icon icon="solar:info-circle-bold-duotone" aria-hidden="true" />
        <span>建议现在刷新，避免继续使用旧页面。</span>
      </div>
    </div>
    <template #footer>
      <div class="version-update-actions">
        <el-button size="large" @click="dialogVisible = false">稍后再说</el-button>
        <el-button type="primary" size="large" @click="handleConfirm">立即刷新</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'

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
:deep(.version-update-dialog) {
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 22px;
  background: linear-gradient(180deg, #f5f9ff 0%, #ffffff 48%);
  box-shadow: 0 24px 80px rgb(26 65 116 / 22%);
}

:deep(.version-update-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 26px 28px 14px;
}

:deep(.version-update-dialog .el-dialog__body) {
  padding: 4px 28px 22px;
}

:deep(.version-update-dialog .el-dialog__footer) {
  padding: 16px 28px 24px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.version-update-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.version-update-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border-radius: 17px;
  color: #fff;
  background: linear-gradient(135deg, #2f80ed, #25a7e8);
  box-shadow: 0 12px 24px rgb(47 128 237 / 25%);
  font-size: 30px;
}

.version-update-heading > span {
  display: block;
  margin-bottom: 3px;
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.version-update-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 22px;
  font-weight: 800;
  line-height: 1.3;
}

.version-update-description {
  margin: 0;
  color: var(--el-text-color-regular);
  font-size: 15px;
  line-height: 1.7;
}

.version-update-tip {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 18px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 13px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  font-size: 13px;
  line-height: 1.5;
}

.version-update-tip :deep(svg) {
  flex: 0 0 auto;
  color: var(--el-color-primary);
  font-size: 20px;
}

.version-update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.version-update-actions :deep(.el-button) {
  min-width: 112px;
  margin-left: 0;
  border-radius: 12px;
  font-weight: 700;
}

/*
 * 暗色下换掉亮色渐变底色。
 *
 * ⚠️ 这里**必须把整条选择器塞进 `:global(...)`**。写成
 * `:global(html.dark) :deep(.version-update-dialog)` 会被编译成**裸 `html.dark {}`** ——
 * 后半截选择器被整个丢掉，暗色规则集体失效（表现为标题发暗、提示条发白），
 * 更糟的是那些属性会被写到 `html` 元素上、污染全页背景与边框。
 * 实测（`@vue/compiler-sfc` 的 `compileStyle`）：只有 `:global(整条选择器)` 才保留完整选择器。
 *
 * 底色用 `--el-bg-color-overlay`（页面主底色 `#1d1e1f`）而不是 `--el-bg-color`（`#141414`）：
 * 后者比页面还暗一档，弹窗浮在页面上像「黑洞」。⚠️ 本项目 Element Plus **未定义**
 * `--el-dialog-bg-color`（实测为空串），所以任何依赖它的 fallback 都会落到 `--el-bg-color`。
 *
 * 其余随主题变化的颜色一律走 `--el-*` 变量（随 `html.dark` 自动切换），不写在这里。
 */
:global(html.dark .version-update-dialog) {
  background: var(--el-bg-color-overlay, #1d1e1f);
  box-shadow: 0 24px 80px rgb(0 0 0 / 45%);
}

@media (max-width: 520px) {
  :deep(.version-update-dialog .el-dialog__header) {
    padding: 22px 20px 12px;
  }

  :deep(.version-update-dialog .el-dialog__body) {
    padding: 4px 20px 18px;
  }

  :deep(.version-update-dialog .el-dialog__footer) {
    padding: 14px 20px 20px;
  }

  .version-update-actions :deep(.el-button) {
    flex: 1;
    min-width: 0;
  }
}
</style>
